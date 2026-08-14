# @l0 L0-002-R · @req JULES-3/REQ-2
# @l0 L0-002 · @req ING-03/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-05
from typing import Any, List, Optional

from khora_kernel.api import (
    ActaDeIngesta,
    ObjetoDeInformacion,
    Proposal,
    PuertoEmbeddings,
    PuertoLLM,
)
from khora_kernel.constructor import extraer, normalizar, phi_m
from khora_kernel.resolucion import resolver


class _MemoriaInterceptora:
    """
    Interceptor local para rastrear los veredictos emitidos durante la resolución,
    dado que el contrato actual de memoria en resolver no devuelve el veredicto.
    """

    def __init__(self, memoria_real: Any):
        self.memoria_real = memoria_real
        self.ideas_novedosas = 0
        self.ideas_repetidas = 0
        self.matices = 0
        self.needs_review = 0
        self._candidatos_cache = {}

    def buscar_entidades_candidatas(self, label_norm: str) -> List[Any]:
        cands = self.memoria_real.buscar_entidades_candidatas(label_norm)
        self._candidatos_cache[label_norm] = cands
        return cands

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: List[float], needs_review: bool = False) -> None:
        if needs_review:
            self.needs_review += 1
            self.ideas_novedosas += 1
        else:
            # Check if canonical_key was already in candidates (MERGE) vs it's brand new (NEW with no collision)
            # Find the original label_norm from caching or check if it ends with a hash (it doesn't here since needs_review=False)
            is_new = True
            for cands in self._candidatos_cache.values():
                for c in cands:
                    if c["canonical_key"] == canonical_key:
                        is_new = False
                        break
                if not is_new:
                    break

            if is_new:
                self.ideas_novedosas += 1
            else:
                self.ideas_repetidas += 1

        # Pasar a la memoria real
        self.memoria_real.merge_entidad(
            canonical_key=canonical_key,
            label_original=label_original,
            provenance_raw=provenance_raw,
            embedding=embedding,
            needs_review=needs_review
        )


def transducir(
    objeto: ObjetoDeInformacion,
    memoria: Any,
    puerto_llm: PuertoLLM,
) -> Proposal:
    # 1. Normalizar
    texto_norm = normalizar(objeto, puerto_llm)

    # 2. Extraer
    # Lector grafo = memoria en modo D1 (sólo lectura implícito en resolver/consultar)
    triples_j7 = phi_m(objeto) + extraer(texto_norm, memoria, puerto_llm)

    entities_set = set()
    for t in triples_j7:
        entities_set.add(t.origen_id)
        entities_set.add(t.destino_id)
    entities = sorted(list(entities_set))

    meta = objeto.metadata or {}
    volcado_id = meta.get("volcado_id")

    version = meta.get("version")
    if version is not None:
        try:
            version = int(version)
        except (ValueError, TypeError):
            pass

    sha256 = meta.get("sha256")
    io_id = objeto.id

    return Proposal(
        source=objeto,
        volcado_id=volcado_id,
        version=version,
        sha256=sha256,
        io_id=io_id,
        entities=entities,
        relations=triples_j7,
        provenance=objeto.provenance
    )


def persistir(
    proposal: Proposal,
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
    on_upsert: Optional[Any] = None,
) -> ActaDeIngesta:
    # 3. Resolver
    interceptor = _MemoriaInterceptora(memoria)
    triples_resueltos = resolver(proposal.relations, interceptor, puerto_llm, puerto_embeddings)

    ideas_novedosas = interceptor.ideas_novedosas
    ideas_repetidas = interceptor.ideas_repetidas
    matices = interceptor.matices
    needs_review = interceptor.needs_review

    # 4. Escribir vía memoria SOLO con MERGE o FUSIÓN
    objeto = proposal.source
    terna = objeto.metadata if hasattr(objeto, 'metadata') and objeto.metadata and 'volcado_id' in objeto.metadata else None
    if hasattr(memoria, 'fusionar_ingesta'):
        triples_escritos = memoria.fusionar_ingesta(triples_resueltos, proposal.provenance, io_id=proposal.io_id, terna_volcado=terna)
    else:
        triples_escritos = memoria.escribir_ingesta(triples_resueltos, proposal.provenance, io_id=proposal.io_id, terna_volcado=terna)

    if on_upsert:
        # Pass the id or the entity logic to the callback.
        # En J-C7 pide 'on_node_upserted(node_id)'
        # Dado que phi_m(objeto) siempre extrae al menos la entidad principal
        # con un ID basado en el objeto (o podemos pasar el objeto id), asumiremos objeto.id
        on_upsert(proposal.io_id, memoria, proposal.provenance.timestamp)

    linea_temporal_indexada = True  # Todos llevan timestamp en la provenance requerida por api.Provenance

    return ActaDeIngesta(
        origen=proposal.provenance.origen,
        timestamp=proposal.provenance.timestamp,
        ideas_novedosas=ideas_novedosas,
        ideas_repetidas=ideas_repetidas,
        matices=matices,
        needs_review=needs_review,
        triples_escritos=triples_escritos,
        linea_temporal_indexada=linea_temporal_indexada
    )


def ingestar(
    objeto: ObjetoDeInformacion,
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
    on_upsert: Optional[Any] = None,
) -> ActaDeIngesta:
    proposal = transducir(objeto, memoria, puerto_llm)
    return persistir(proposal, memoria, puerto_llm, puerto_embeddings, on_upsert)


def frecuencia(memoria: Any, canonical_key: str) -> int:
    return memoria.frecuencia(canonical_key)


def linea_temporal(memoria: Any, desde: str, hasta: str) -> List[Any]:
    return memoria.linea_temporal(desde, hasta)
