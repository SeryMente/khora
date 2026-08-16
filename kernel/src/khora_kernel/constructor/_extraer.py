# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06
import hashlib
import os
from datetime import datetime, timezone

from khora_kernel.api import (
    ContextoDeVisibilidad,
    Provenance,
    PuertoLLM,
    SolicitudLLM,
    Triple,
)


def _chunk_text(texto: str) -> list[str]:
    # (a) chunking 600 tokens con overlap 100
    # Decisión D3: tiktoken inviable -> tokenizer HF equivalente/simulado fallback
    chunk_size = int(os.environ.get("KHORA_CHUNK_SIZE", "600"))
    overlap = int(os.environ.get("KHORA_CHUNK_OVERLAP", "100"))

    # Simple word-based chunking for D3 fallback without external deps
    words = texto.split()
    chunks = []

    if not words:
        return []

    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += (chunk_size - overlap)
        if chunk_size - overlap <= 0:
            break  # Evitar loop infinito si hay mala config

    return chunks


def _mock_ner(chunk: str) -> list[tuple[str, str, str]]:
    # Mock de NER para pre-entidades (origen, relacion, destino)
    # Extrae pares de palabras consecutivas como relaciones simples para no necesitar LLM en tests
    words = chunk.split()
    triples = []
    if len(words) >= 3:
        triples.append((words[0], "related_to", words[-1]))
    return triples


def _llm_ner(chunk: str, puerto_llm: PuertoLLM) -> list[tuple]:
    # NER real con LLM
    sistema_prompt = (
        "Eres un extractor de grafos de conocimiento de alta precisión. Devuelve tu respuesta como una lista en formato CSV (origen, relacion, destino, tipo_opcional).\n"
        "Instrucciones estrictas:\n"
        "1. NUNCA extraigas un verbo conjugado como entidad (origen o destino); usa únicamente sustantivos, nombres propios o frases nominales.\n"
        "2. Devuelve el tipo de entidad cuando sea inferible (Persona, Lugar, Organización, Concepto, Evento) como cuarta columna opcional en el CSV.\n"
        "3. NO inventes relaciones que no estén sustentadas literalmente en el texto del chunk."
    )
    solicitud = SolicitudLLM(
        prompt=f"Extrae entidades y relaciones de este texto:\n\n{chunk}",
        sistema=sistema_prompt,
        formato_estricto=None,
        metadata={"temperature": 0.0},
    )
    resp = puerto_llm.generar(solicitud)
    triples = []
    for line in resp.texto.splitlines():
        if "," in line:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                orig = parts[0]
                rel = parts[1]
                dest = parts[2]
                tipo = parts[3] if len(parts) >= 4 and parts[3] else None
                if orig and rel and dest:
                    if tipo:
                        triples.append((orig, rel, dest, tipo))
                    else:
                        triples.append((orig, rel, dest))
    return triples


def _gleaning_loop(chunk: str, pre_entidades: list, puerto_llm: PuertoLLM | None = None) -> list:
    # (d) gleaning
    max_rounds = int(os.environ.get("KHORA_GLEANING_MAX_ROUNDS", "2"))

    for _ in range(max_rounds):
        # Pregunta de continuación "¿faltaron entidades? SI/NO"
        if puerto_llm:
            solicitud = SolicitudLLM(
                prompt=f"¿Faltaron entidades por extraer en este texto basándonos en lo ya extraído?\n\nTexto: {chunk}\nExtraído: {pre_entidades}",
                sistema=None,
                formato_estricto=("SI", "NO"),
                metadata={"temperature": 0.0},
            )
            resp = puerto_llm.generar(solicitud)
            faltaron = resp.texto
        else:
            faltaron = "NO"  # Mock behavior

        if faltaron == "NO":
            break
        # Si fuera SI, extraeríamos más (simplificado D4: no hay estado real de extraer más en este paso, pero la llamada al puerto se realiza)
        if puerto_llm:
            nuevas = _llm_ner(chunk, puerto_llm)
            pre_entidades.extend([n for n in nuevas if n not in pre_entidades])

    return pre_entidades


def extraer(texto: str, lector_grafo, puerto_llm: PuertoLLM | None = None) -> list[Triple]:
    """
    fKGC: Extracción de contenido con gleaning.
    """
    triples_extraidos = []
    chunks = _chunk_text(texto)

    # (c) correferencia SOLO-LECTURA
    if lector_grafo and hasattr(lector_grafo, "consultar"):
        _ = lector_grafo.consultar("¿Qué entidades existen?", ContextoDeVisibilidad.TRANSPARENTE)

    for chunk in chunks:
        if puerto_llm:
            pre_entidades = _llm_ner(chunk, puerto_llm)
        else:
            pre_entidades = _mock_ner(chunk)

        final_entidades = _gleaning_loop(chunk, pre_entidades, puerto_llm)

        for item in final_entidades:
            orig = item[0]
            rel = item[1]
            dest = item[2]
            tipo = item[3] if len(item) >= 4 and item[3] else None

            # Hash para id determinista
            id_str = f"{orig}-{rel}-{dest}"
            id_hash = hashlib.sha256(id_str.encode()).hexdigest()[:16]

            ts_actual = datetime.now(timezone.utc).isoformat()
            prov = Provenance(origen="fKGC_extractor", driver="fKGC", timestamp=ts_actual)

            metadata = {"tipo": tipo} if tipo else {}

            triple = Triple(
                id=f"t-{id_hash}",
                origen_id=orig,
                destino_id=dest,
                relacion=rel,
                provenance=prov,
                metadata=metadata,
                valid_at=ts_actual,
                invalid_at=None,
                created_at=ts_actual,
            )
            triples_extraidos.append(triple)

    return triples_extraidos
