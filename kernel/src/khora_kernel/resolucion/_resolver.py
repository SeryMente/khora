# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06,UA-08,UA-25,UA-30

import os
import re
import unicodedata
from collections import defaultdict
from typing import Any

from khora_kernel.api import PuertoEmbeddings, PuertoLLM, Triple


def _quitar_articulo_inicial(texto: str) -> str:
    """
    Quita artículos iniciales en español (el, la, los, las, un, una, unos, unas)
    respetando límites de palabra (\b) para no alterar nombres como "Elena".
    """
    texto_l = texto.lstrip()
    m = re.match(r"^(?:el|la|los|las|un|una|unos|unas)\b\s*", texto_l, flags=re.IGNORECASE)
    if m:
        return texto_l[m.end():]
    return texto


def _quitar_acentos_casefold(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    sin_acentos = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return sin_acentos.casefold().strip()


def _normalizar_label(label: str) -> str:
    limpio = _quitar_articulo_inicial(label)
    nfkd = unicodedata.normalize("NFKD", limpio)
    sin_acentos = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return sin_acentos.casefold().strip().replace(" ", "_")


def resolver(
    triples: list[Triple],
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
) -> list[Triple]:
    """
    Resuelve entidades hacia canonical_keys en memoria.
    Regla determinista explícita de autorreferencia (L0-003 §2 Etapa 3) y
    fusión real acumulativa de procedencia (L0-003 §2 Etapa 4).
    """
    contextos_por_id: dict[str, list[str]] = defaultdict(list)
    etiquetas_por_id: dict[str, str] = {}

    for t in triples:
        contextos_por_id[t.origen_id].append(f"Actúa como origen en: {t.relacion} hacia {t.destino_id}")
        contextos_por_id[t.destino_id].append(f"Actúa como destino en: {t.origen_id} con relación {t.relacion}")
        etiquetas_por_id[t.origen_id] = t.origen_id
        etiquetas_por_id[t.destino_id] = t.destino_id

    mapeo_claves: dict[str, str] = {}

    operador_canonical_raw = os.environ.get("KHORA_OPERADOR_CANONICAL_KEY", "root")
    operador_norm = _quitar_acentos_casefold(operador_canonical_raw)
    vocabulario_autorreferencia = {"yo", "operador", "mi", "conmigo"}

    for crudo_id, descripcion_lista in contextos_por_id.items():
        crudo_norm = _quitar_acentos_casefold(crudo_id)

        # Regla determinista de autorreferencia (L0-003 §2 Etapa 3)
        if crudo_norm in vocabulario_autorreferencia or crudo_norm == operador_norm:
            canonical = operador_canonical_raw
        else:
            canonical = _normalizar_label(crudo_id)

        candidatos_memoria = memoria.buscar_entidades_candidatas(canonical)
        vec_nuevo = puerto_embeddings.incrustar([crudo_id])[0]

        # Fusión real: si hay coincidencia EXACTA con un canonical_key en memoria, reutilizar
        coincidencia_exacta = any(
            isinstance(c, dict) and c.get("canonical_key") == canonical
            for c in candidatos_memoria
        )

        needs_review = not coincidencia_exacta

        memoria.merge_entidad(
            canonical_key=canonical,
            label_original=crudo_id,
            provenance_raw=str(descripcion_lista),
            embedding=vec_nuevo,
            needs_review=needs_review,
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
            created_at=t.created_at,
        )
        triples_resueltos.append(nuevo_t)

    return triples_resueltos
