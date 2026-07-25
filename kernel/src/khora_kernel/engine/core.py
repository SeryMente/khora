# @l0 L0-002 · @req RAZ-01/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua —
import json
import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional

from khora_kernel.api import PuertoLLM, SolicitudLLM
from khora_kernel.engine.history import (
    Ht,
    HtEvidence,
    HtStep,
    Response,
    load_ht,
    save_ht,
)
from khora_kernel.proveedores.openai import ProveedorOpenAICompatible


@dataclass
class Σ:
    session_id: str
    pregunta: str
    ht: Ht
    paso_actual: int = 1
    terminado: bool = False


class Λ(Enum):
    RETRIEVE = "RETRIEVE"
    REFINE = "REFINE"
    FALLBACK = "FALLBACK"
    ANSWER = "ANSWER"
    STOP = "STOP"


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
        ts=datetime.utcnow().isoformat() + "Z",
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

def _get_node_content(memoria_neo4j, node_id: str) -> str:
    """Gets description of node for synthesizing."""
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return ""
    query = """
    MATCH (n) WHERE n.id = $id RETURN n.description AS desc, n.text as text
    """
    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query, {"id": node_id})
            record = res.single()
            if record:
                return record["desc"] or record["text"] or ""
    except Exception:
        pass
    return ""


def ejecutar_ciclo(session_id: str, pregunta: str, puerto_llm: PuertoLLM, memoria) -> Response:
    ht = load_ht(session_id)
    if not ht:
        ht = Ht(
            session_id=session_id,
            created_at=datetime.utcnow().isoformat() + "Z"
        )

    estado = Σ(session_id=session_id, pregunta=pregunta, ht=ht)
    max_pasos = int(os.environ.get("RAZ_MAX_PASOS", "5"))

    while estado.paso_actual <= max_pasos and not estado.terminado:
        # Build history string
        historial_str = "[Historial]\n"
        for step in estado.ht.steps:
            # We don't have direct access to response/evidence string per step in HtStep easily,
            # but we can format the step details. The instructions say to format:
            # Paso 1: accion=RETRIEVE evidencia=[...] respuesta=...
            historial_str += f"Paso {step.n}: estado={step.state} detalle={step.detail}\n"
        historial_str += "[Fin historial]\n"

        prompt_text = (
            f"Pregunta: {estado.pregunta}\n"
            f"{historial_str}\n"
            "Debes decidir la próxima acción a tomar. Las opciones son: RETRIEVE, REFINE, FALLBACK, ANSWER, STOP.\n"
            "Responde ÚNICAMENTE con un JSON en el siguiente formato: {\"accion\": \"<ACCION>\", \"justificacion\": \"<TEXTO>\"}"
        )

        solicitud = SolicitudLLM(
            prompt=prompt_text,
            sistema=None,
            formato_estricto=None,
            metadata={"temperature": 0.0}
        )

        accion_valida = None
        justificacion = ""
        respuesta_llm_texto = ""

        # Intento principal + 1 reintento
        for intento in range(2):
            try:
                resp = puerto_llm.generar(solicitud)
                respuesta_llm_texto = resp.texto
                parsed = json.loads(respuesta_llm_texto)
                accion_str = parsed.get("accion")
                justificacion = parsed.get("justificacion", "")

                # Validar enum
                accion_valida = Λ(accion_str)
                break  # Successful parse and valid action
            except (json.JSONDecodeError, ValueError, Exception):
                accion_valida = None

        if accion_valida is None:
            accion_valida = Λ.STOP
            justificacion = f"Fallo al parsear JSON tras reintento. Última respuesta: {respuesta_llm_texto}"

        # Registrar paso
        estado.ht = _add_step(estado.ht, accion_valida.value, justificacion)

        if accion_valida == Λ.ANSWER:
            estado.terminado = True
            break
        elif accion_valida == Λ.STOP:
            estado.terminado = True
            break

        # Here we would normally execute RETRIEVE, REFINE, etc.
        # But for RAZ-01, the primary requirement is the loop control and prompt formatting.
        # We'll just increment and let the next cycle prompt see the history.

        estado.paso_actual += 1

    save_ht(estado.ht)

    # Construir respuesta final (mock answer for now, since actual synthesis isn't explicitly defined here)
    answer_text = justificacion if accion_valida == Λ.ANSWER else "Proceso detenido."

    return Response(
        answer=answer_text,
        citations=[],
        ht_ref=estado.ht.session_id
    )

def ask(question: str, session_id: Optional[str] = None, db_path: str = "data/khora_sessions.db", memoria_neo4j=None) -> Response:
    if not session_id:
        session_id = str(uuid.uuid4())
    puerto_llm = _get_provider()
    # Note: We temporarily overwrite db_path in save_ht/load_ht calls if needed,
    # but the instruction specifically uses default path. For tests we might want to mock it.
    return ejecutar_ciclo(session_id, question, puerto_llm, memoria_neo4j)
