# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06,UA-08,UA-25,UA-30

import hashlib
import unicodedata
from collections import defaultdict
from typing import Any

from khora_kernel.api import PuertoEmbeddings, PuertoLLM, Triple


def _normalizar_label(label: str) -> str:
    nfkd = unicodedata.normalize("NFKD", label)
    sin_acentos = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return sin_acentos.casefold().strip().replace(" ", "_")


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

    mapeo_claves: dict[str, str] = {}

    for crudo_id, descripcion_lista in contextos_por_id.items():
        desc_multi = " | ".join(descripcion_lista)
        label_norm = _normalizar_label(crudo_id)

        candidatos_memoria = memoria.buscar_entidades_candidatas(label_norm)
        vec_nuevo = puerto_embeddings.incrustar([crudo_id])[0]

        canonical = label_norm
        # Si la clave normalizada ya existe en memoria, pero somos una iteración de ingesta,
        # para no colapsar entidades distintas que normalizan igual, generamos un sufijo si hay colisión,
        # asumiendo siempre un comportamiento NEW en el kernel (cero fusión destructiva).
        if any(c["canonical_key"] == canonical for c in candidatos_memoria):
            canonical = f"{canonical}_{hashlib.sha256(desc_multi.encode('utf-8')).hexdigest()[:8]}"

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
            metadata=t.metadata,
            valid_at=t.valid_at,
            invalid_at=t.invalid_at,
            created_at=t.created_at
        )
        triples_resueltos.append(nuevo_t)

    return triples_resueltos
