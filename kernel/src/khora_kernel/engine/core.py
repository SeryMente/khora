import os
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List, Any, Dict

from khora_kernel.engine.history import Ht, HtStep, HtEvidence, Response, save_ht, load_ht
from khora_kernel.embeddings import knn
from khora_kernel.summaries import get_all_communities
from khora_kernel.api import SolicitudLLM, PuertoLLM
from khora_kernel.proveedores.openai import ProveedorOpenAICompatible

def is_local_query(question: str) -> bool:
    """
    D2: Clasificación global/local.
    Heurística simple: Si hay palabras con mayúscula inicial (Title Case)
    asumimos que hay entidades nombradas -> búsqueda local.
    Si no, búsqueda global.
    Ignora la primera palabra de la frase.
    """
    words = question.split()
    if len(words) <= 1:
        return False
    # Check words from the second one onwards
    for w in words[1:]:
        # If any word starts with uppercase, it's considered an entity
        w = re.sub(r'[^a-zA-Z\s]', '', w) # strip punctuation
        if w and w[0].isupper():
            return True
    return False

def _get_provider() -> PuertoLLM:
    """D3: Modelo de síntesis. Usar proveedor del repo."""
    # The instructions say D3: modelo de sintesis -> docs/model-stack.md; ausente -> proveedor del repo + "SUSTITUCIÓN NO VALIDADA"
    return ProveedorOpenAICompatible()

def _add_step(ht: Ht, state: str, detail: str) -> Ht:
    step = HtStep(
        n=len(ht.steps) + 1,
        state=state,
        ts=datetime.now(timezone.utc).isoformat() + "Z",
        detail=detail
    )
    # Re-create Ht as it's frozen
    return Ht(
        session_id=ht.session_id,
        created_at=ht.created_at,
        steps=ht.steps + [step],
        evidence=ht.evidence,
        verdicts=ht.verdicts
    )

def _add_evidence(ht: Ht, evidence_list: List[HtEvidence]) -> Ht:
    return Ht(
        session_id=ht.session_id,
        created_at=ht.created_at,
        steps=ht.steps,
        evidence=ht.evidence + evidence_list,
        verdicts=ht.verdicts
    )

def _get_node_content(memoria_neo4j: Any, node_id: str) -> str:
    """Gets description of node for synthesizing."""
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None: # type: ignore
        return ""
    query = """
    MATCH (n) WHERE n.id = $id RETURN n.description AS desc, n.text as text
    """
    try:
        with memoria_neo4j._driver.session() as session: # type: ignore
            res = session.run(query, {"id": node_id}) # type: ignore
            record = res.single() # type: ignore
            if record:
                return str(record["desc"] or record["text"] or "")
    except Exception:
        pass
    return ""


def ask(question: str, session_id: Optional[str] = None, db_path: str = "data/khora_sessions.db", memoria_neo4j: Any = None) -> Response:
    if not session_id:
        session_id = str(uuid.uuid4())

    ht = load_ht(session_id, db_path)
    if not ht:
        ht = Ht(
            session_id=session_id,
            created_at=datetime.now(timezone.utc).isoformat() + "Z"
        )

    # 1. RECIBIR
    ht = _add_step(ht, "RECIBIR", f"Pregunta recibida: {question}")

    # 2. RECUPERAR
    # D2: mode classification
    is_local = is_local_query(question)
    mode = "local" if is_local else "global"

    ht = _add_step(ht, "RECUPERAR", f"Modo de búsqueda determinado: {mode}")

    context_chunks: List[str] = []
    new_evidence: List[HtEvidence] = []

    if mode == "local":
        # embeddings.knn()
        results = knn(question, k=5)
        for r_id, _ in results:
            content = _get_node_content(memoria_neo4j, r_id)
            context_chunks.append(f"Entidad [{r_id}]: {content}")
            new_evidence.append(HtEvidence(node_id=r_id, triple="", source_step=len(ht.steps)))
    else:
        # summaries
        communities: List[Dict[str, Any]] = get_all_communities(memoria_neo4j) # type: ignore
        for c in communities:
            cid = str(c["cid"])
            # To get summary we need to fetch info
            from khora_kernel.summaries import get_community_info
            info: Dict[str, Any] = get_community_info(memoria_neo4j, cid) # type: ignore
            if info and "summary" in info:
                context_chunks.append(f"Comunidad [{cid}]: {info['summary']}")
                new_evidence.append(HtEvidence(node_id=cid, triple="", source_step=len(ht.steps)))

    ht = _add_evidence(ht, new_evidence)

    # 3. SINTETIZAR
    ht = _add_step(ht, "SINTETIZAR", f"Sintetizando con {len(context_chunks)} fragmentos de contexto.")
    provider = _get_provider()

    context_str = "\n".join(context_chunks)

    # Enforce evidence mapping logic
    # "toda afirmación del answer mapea a ≥1 elemento de evidence"
    system_prompt = (
        "Responde a la pregunta basándote estrictamente en el contexto proporcionado.\n"
        "Si no hay stack de modelo configurado, advierte: SUSTITUCIÓN NO VALIDADA.\n"
        "Al final de cada frase que escribas, DEBES citar la fuente usando el formato [id_fuente].\n"
        "Ejemplo: El cielo es azul [nodo123]. La tierra es redonda [comunidad456]."
    )

    if not os.path.exists("docs/model-stack.md"):
         system_prompt += "\nPor favor, incluye textualmente la frase 'SUSTITUCIÓN NO VALIDADA' en tu respuesta ya que el archivo docs/model-stack.md está ausente."

    solicitud = SolicitudLLM(
        prompt=f"Contexto:\n{context_str}\n\nPregunta: {question}",
        sistema=system_prompt,
        formato_estricto=None,
        metadata={"temperature": 0.0}
    )

    try:
        resp = provider.generar(solicitud)
        answer = resp.texto
    except Exception as e:
        answer = f"Error al generar respuesta: {e}"
        if not os.path.exists("docs/model-stack.md"):
             answer += "\nSUSTITUCIÓN NO VALIDADA"

    # Extract citations
    citations: List[str] = []
    # Find all brackets like [id]
    matches = re.findall(r'\[([^\]]+)\]', answer)
    for m in matches:
        if any(e.node_id == m for e in ht.evidence):
            citations.append(m)

    # Remove duplicates
    citations = list(set(citations))

    # 4. EMITIR
    ht = _add_step(ht, "EMITIR", f"Respuesta generada con {len(citations)} citas.")
    save_ht(ht, db_path)

    return Response(
        answer=answer,
        citations=citations,
        ht_ref=ht.session_id
    )
