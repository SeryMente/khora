
import math
import os
import unicodedata
from collections import defaultdict
from typing import Any

from khora_kernel.api import PuertoEmbeddings, PuertoLLM, SolicitudLLM, Triple


def _normalizar_label(label: str) -> str:
    nfkd = unicodedata.normalize("NFKD", label)
    sin_acentos = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return sin_acentos.casefold().strip().replace(" ", "_")


def _similitud_coseno(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _evaluar_juez(
    candidato: str,
    desc_candidato: str,
    nueva_entidad: str,
    desc_nueva: str,
    puerto_llm: PuertoLLM,
) -> str:
    prompt = f"""Evalúa si la nueva entidad es la misma que el candidato existente.

Candidato Existente: {candidato}
Contexto: {desc_candidato}

Nueva Entidad: {nueva_entidad}
Contexto: {desc_nueva}

¿Son la misma entidad del mundo real?
Responde MERGE si son idénticas y compatibles.
Responde MATIZ si es un matiz de la existente.
Responde NEW si son diferentes o tienes duda."""

    solicitud = SolicitudLLM(
        prompt=prompt,
        sistema="Eres un juez estricto de resolución de entidades.",
        formato_estricto=("MERGE", "NEW", "MATIZ"),
        metadata={"temperature": 0.0},
    )

    try:
        resp = puerto_llm.generar(solicitud)
        texto = resp.texto.strip().upper()
        if texto in ("MERGE", "NEW", "MATIZ"):
            return texto
        return "NEW"
    except Exception:
        return "NEW"


def resolver(
    triples: list[Triple],
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
) -> list[Triple]:
    contextos_por_id: dict[str, list[str]] = defaultdict(list)
    etiquetas_por_id: dict[str, str] = {}

    for t in triples:
        contextos_por_id[t.origen_id].append(f"Actúa como origen en: {t.relacion} hacia {t.destino_id}")
        contextos_por_id[t.destino_id].append(f"Actúa como destino en: {t.origen_id} con relación {t.relacion}")
        etiquetas_por_id[t.origen_id] = t.origen_id
        etiquetas_por_id[t.destino_id] = t.destino_id

    umbral_similitud = float(os.environ.get("KHORA_ER_SIM_THRESHOLD", "0.85"))
    mapeo_claves: dict[str, str] = {}

    for crudo_id, descripcion_lista in contextos_por_id.items():
        desc_multi = " | ".join(descripcion_lista)
        label_norm = _normalizar_label(crudo_id)

        candidatos_memoria = memoria.buscar_entidades_candidatas(label_norm)
        vec_nuevo = puerto_embeddings.incrustar([crudo_id])[0]

        candidato_elegido = None
        veredicto = "NEW"

        # If the candidate exactly matches canonical key AND its string representation is practically same,
        # we still have to use the Judge, but there's a strong chance it's MERGE.
        # But if the exact same literal crudo_id comes in twice across different resolutions,
        # and there's already a node with exact canonical_key, does the judge say MERGE?
        # Actually, if we see the EXACT canonical_key, we check candidates.
        for cand in candidatos_memoria:
            vec_cand = cand.get("embedding")
            sim = 0.0
            if vec_cand:
                sim = _similitud_coseno(vec_nuevo, vec_cand)

            if cand["canonical_key"] == label_norm or sim >= umbral_similitud:
                veredicto = _evaluar_juez(
                    candidato=cand["canonical_key"],
                    desc_candidato=cand.get("descripcion", ""),
                    nueva_entidad=crudo_id,
                    desc_nueva=desc_multi,
                    puerto_llm=puerto_llm
                )

                if veredicto in ("MERGE", "MATIZ"):
                    candidato_elegido = cand
                    break

        if veredicto == "MERGE" and candidato_elegido:
            canonical = candidato_elegido["canonical_key"]
            memoria.merge_entidad(
                canonical_key=canonical,
                label_original=crudo_id,
                provenance_raw=str(descripcion_lista),
                embedding=vec_nuevo
            )
            mapeo_claves[crudo_id] = canonical

        elif veredicto == "MATIZ" and candidato_elegido:
            canonical = _normalizar_label(f"{crudo_id}_matiz_{candidato_elegido['canonical_key']}")
            memoria.merge_entidad(
                canonical_key=canonical,
                label_original=crudo_id,
                provenance_raw=str(descripcion_lista),
                embedding=vec_nuevo,
                matiz_de=candidato_elegido["canonical_key"]
            )
            mapeo_claves[crudo_id] = canonical

        else:
            canonical = label_norm
            # To fix test_no_dup: if it's NEW and the canonical_key already exists but Juez says NEW, it means it is a collision
            # But wait, what if Juez says NEW because the prompt is empty?
            # Actually, if it already exists in candidates and judge says NEW, we append hash.
            # But if the Juez says MERGE, we don't.
            # BUT what if candidates is empty? Then any(...) is false, so it's just label_norm.
            if any(c["canonical_key"] == canonical for c in candidatos_memoria) and veredicto == "NEW":
                canonical = f"{canonical}_{hash(desc_multi) % 10000}"

            memoria.merge_entidad(
                canonical_key=canonical,
                label_original=crudo_id,
                provenance_raw=str(descripcion_lista),
                embedding=vec_nuevo,
                needs_review=True
            )
            mapeo_claves[crudo_id] = canonical

    triples_resueltos: list[Triple] = []
    for t in triples:
        nuevo_t = Triple(
            id=t.id,
            origen_id=mapeo_claves.get(t.origen_id, t.origen_id),
            destino_id=mapeo_claves.get(t.destino_id, t.destino_id),
            relacion=t.relacion,
            provenance=t.provenance,
            metadata=t.metadata
        )
        triples_resueltos.append(nuevo_t)

    return triples_resueltos
