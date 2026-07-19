import hashlib
import os

from khora_kernel.api import ContextoDeVisibilidad, Provenance, Triple


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
            break # Evitar loop infinito si hay mala config

    return chunks

def _mock_ner(chunk: str) -> list[tuple[str, str, str]]:
    # Mock de NER para pre-entidades (origen, relacion, destino)
    # Extrae pares de palabras consecutivas como relaciones simples para no necesitar LLM en tests
    words = chunk.split()
    triples = []
    if len(words) >= 3:
        triples.append((words[0], "related_to", words[-1]))
    return triples

def _gleaning_loop(chunk: str, pre_entidades: list) -> list:
    # (d) gleaning
    max_rounds = int(os.environ.get("KHORA_GLEANING_MAX_ROUNDS", "2"))

    for _ in range(max_rounds):
        # Pregunta de continuación "¿faltaron entidades? SI/NO"
        # Decisión D4: proveedor sin logit_bias -> formato estricto SI|NO
        faltaron = "NO"  # Mock behavior
        if faltaron == "NO":
            break
        # Si fuera SI, extraeríamos más

    return pre_entidades

def extraer(texto: str, lector_grafo) -> list[Triple]:
    """
    fKGC: Extracción de contenido con gleaning.
    """
    triples_extraidos = []
    chunks = _chunk_text(texto)

    # (c) correferencia SOLO-LECTURA
    # lector_grafo.consultar(...)
    if lector_grafo:
        # Simulamos una lectura al grafo sin escribir
        _ = lector_grafo.consultar("¿Qué entidades existen?", ContextoDeVisibilidad.TRANSPARENTE)

    for chunk in chunks:
        pre_entidades = _mock_ner(chunk)
        final_entidades = _gleaning_loop(chunk, pre_entidades)

        for orig, rel, dest in final_entidades:
            # Hash para id determinista
            id_str = f"{orig}-{rel}-{dest}"
            id_hash = hashlib.sha256(id_str.encode()).hexdigest()[:16]

            # Un Triple sin procedencia es INVÁLIDO.
            # Como fKGC crea nuevos triples derivados, les asignamos un provenance derivado o exigimos que el que llama los emita con uno.
            # En la firma 'extraer(texto, lector_grafo)', no recibimos provenance.
            # ¡Espera! El validador (nuestra propia lógica) rechaza un Triple sin procedencia.
            # Así que creamos un provenance default derivado del proceso "fKGC".
            prov = Provenance(origen="fKGC_extractor", driver="fKGC", timestamp="2026-07-19T00:00:00Z")

            triple = Triple(
                id=f"t-{id_hash}",
                origen_id=orig,
                destino_id=dest,
                relacion=rel,
                provenance=prov,
                metadata={}
            )
            triples_extraidos.append(triple)

    return triples_extraidos