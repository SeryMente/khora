# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06,UA-08,UA-25,UA-30

import math
import os
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, List, Optional

from khora_kernel.api import PuertoEmbeddings, PuertoLLM, Triple
from khora_kernel.contracts.proposal import ResolutionCandidate


@dataclass(frozen=True)
class EntidadResolucion:
    raw_label: str
    canonical_key: str
    decision: str  # "NEW" | "MERGE" | "MATIZ" | "REVIEW"
    needs_review: bool
    candidates: List[ResolutionCandidate]
    embedding: Optional[List[float]] = None
    provenance_context: Optional[str] = None


class TriplesResueltos(list):
    entidades: dict[str, EntidadResolucion]

    def __init__(self, triples: list[Triple], entidades: dict[str, EntidadResolucion]):
        super().__init__(triples)
        self.entidades = entidades


def _coseno(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


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
) -> TriplesResueltos:
    """
    Resuelve entidades hacia canonical_keys consultando memoria en MODO LECTURA PURA (READ-ONLY).
    CERO escrituras (no llama merge_entidad ni ejecuta Cypher de mutación).
    Calcula scores con embeddings verdaderos cuando existen candidatos.
    """
    contextos_por_id: dict[str, list[str]] = defaultdict(list)
    etiquetas_por_id: dict[str, str] = {}

    for t in triples:
        contextos_por_id[t.origen_id].append(f"Actúa como origen en: {t.relacion} hacia {t.destino_id}")
        contextos_por_id[t.destino_id].append(f"Actúa como destino en: {t.origen_id} con relación {t.relacion}")
        etiquetas_por_id[t.origen_id] = t.origen_id
        etiquetas_por_id[t.destino_id] = t.destino_id

    mapeo_claves: dict[str, str] = {}
    entidades_resolucion: dict[str, EntidadResolucion] = {}

    operador_canonical_raw = os.environ.get("KHORA_OPERADOR_CANONICAL_KEY", "root")
    operador_norm = _quitar_acentos_casefold(operador_canonical_raw)
    vocabulario_autorreferencia = {"yo", "operador", "mi", "conmigo"}

    for crudo_id, descripcion_lista in contextos_por_id.items():
        crudo_norm = _quitar_acentos_casefold(crudo_id)

        # Regla determinista de autorreferencia
        if crudo_norm in vocabulario_autorreferencia or crudo_norm == operador_norm:
            canonical = operador_canonical_raw
        else:
            canonical = _normalizar_label(crudo_id)

        candidatos_memoria = memoria.buscar_entidades_candidatas(canonical) if hasattr(memoria, "buscar_entidades_candidatas") else []
        vec_nuevo = puerto_embeddings.incrustar([crudo_id])[0] if puerto_embeddings else None

        candidates_list: List[ResolutionCandidate] = []
        exact_match = False
        best_cand_key = canonical
        best_score = 0.0

        for cand in candidatos_memoria:
            cand_key = cand.get("canonical_key") if isinstance(cand, dict) else getattr(cand, "canonical_key", None)
            cand_emb = cand.get("embedding") if isinstance(cand, dict) else getattr(cand, "embedding", None)
            cand_label = cand.get("label_original", cand_key) if isinstance(cand, dict) else cand_key

            score = 0.0
            if cand_key == canonical:
                exact_match = True
                score = 1.0
                best_score = 1.0
                best_cand_key = cand_key
            elif vec_nuevo and cand_emb:
                score = _coseno(vec_nuevo, cand_emb)
                if score > best_score:
                    best_score = score
                    best_cand_key = cand_key

            cand_review = not (cand_key == canonical)
            cand_key_str = str(cand_key or canonical)
            candidates_list.append(
                ResolutionCandidate(
                    canonical_key=cand_key_str,
                    score=float(score),
                    label=str(cand_label or cand_key_str),
                    needs_review=cand_review,
                )
            )

        if exact_match:
            decision = "MERGE"
            needs_review = False
            chosen_canonical = canonical
        elif best_score >= 0.85:
            decision = "MATIZ"
            needs_review = True
            chosen_canonical = best_cand_key
        elif candidatos_memoria:
            decision = "REVIEW"
            needs_review = True
            chosen_canonical = canonical
        else:
            decision = "NEW"
            needs_review = False
            chosen_canonical = canonical

        chosen_canonical_str = str(chosen_canonical or canonical)

        if not candidates_list:
            candidates_list.append(
                ResolutionCandidate(
                    canonical_key=chosen_canonical_str,
                    score=1.0,
                    label=crudo_id,
                    needs_review=needs_review,
                )
            )

        entidades_resolucion[crudo_id] = EntidadResolucion(
            raw_label=crudo_id,
            canonical_key=chosen_canonical_str,
            decision=decision,
            needs_review=needs_review,
            candidates=candidates_list,
            embedding=vec_nuevo,
            provenance_context=str(descripcion_lista),
        )
        mapeo_claves[crudo_id] = chosen_canonical_str

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

    return TriplesResueltos(triples_resueltos, entidades_resolucion)
