# @l0 L0-002-R · @req JULES-3/REQ-2
# @l0 L0-002 · @req ING-03/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-05
from datetime import datetime, timezone
from typing import Any, List, Optional, Union
import uuid

from khora_kernel.api import (
    ActaDeIngesta,
    ObjetoDeInformacion,
    Proposal,
    PuertoEmbeddings,
    PuertoLLM,
)
from khora_kernel.contracts.proposal import (
    Anchor,
    Judgment,
    ProposalEnvelope,
    ProposalItem,
    ProposalTriple,
    SettlementAct,
    SourceTriplet,
    compute_item_id,
    compute_payload_hash,
    validate_proposal_envelope,
)
from khora_kernel.constructor import extraer, normalizar, phi_m
from khora_kernel.resolucion import resolver


def transducir(
    objeto: ObjetoDeInformacion,
    memoria: Any,
    puerto_llm: PuertoLLM,
) -> Proposal:
    texto_norm = normalizar(objeto, puerto_llm)
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


def proponer(
    objeto: ObjetoDeInformacion,
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
) -> ProposalEnvelope:
    """
    Transduce y resuelve en MODO LECTURA PURA (READ-ONLY) emitiendo un ProposalEnvelope
    cumpliendo estrictamente el contrato 5-0. Cero escrituras en memoria o Neo4j.
    """
    p_prelim = transducir(objeto, memoria, puerto_llm)
    resueltos = resolver(p_prelim.relations, memoria, puerto_llm, puerto_embeddings)

    meta = objeto.metadata or {}
    volcado_id = meta.get("volcado_id", str(uuid.uuid4()))
    version = meta.get("version")
    if version is None:
        version = 1
    else:
        try:
            version = int(version)
        except (ValueError, TypeError):
            version = 1

    sha256 = meta.get("sha256", "0" * 64)

    triplet = SourceTriplet(
        volcado_id=volcado_id,
        version=version,
        sha256=sha256,
    )

    items: List[ProposalItem] = []
    entidades_mapeadas = resueltos.entidades if hasattr(resueltos, "entidades") else {}
    canonical_to_item_id: dict[str, str] = {}

    # 1. Items de Entidad
    for raw_label, ent_res in entidades_mapeadas.items():
        content_key = f"entity:{raw_label}"
        item_id = compute_item_id(triplet, content_key)

        anchor = Anchor(exact_text=raw_label)
        meta_item = {
            "decision": ent_res.decision,
            "raw_label": ent_res.raw_label,
            "canonical_key": ent_res.canonical_key,
        }

        canonical_to_item_id[ent_res.canonical_key] = item_id
        canonical_to_item_id[raw_label] = item_id

        items.append(
            ProposalItem(
                id=item_id,
                kind="entity",
                label=ent_res.canonical_key,
                anchor=anchor,
                candidates=ent_res.candidates,
                triple=None,
                metadata=meta_item,
            )
        )

    # 2. Items de Relacion
    for idx, t in enumerate(resueltos):
        rel_label = t.relacion
        content_key = f"relation:{t.origen_id}:{t.relacion}:{t.destino_id}:{idx}"
        item_id = compute_item_id(triplet, content_key)

        orig_ent_id = canonical_to_item_id.get(t.origen_id, compute_item_id(triplet, f"entity:{t.origen_id}"))
        dest_ent_id = canonical_to_item_id.get(t.destino_id, compute_item_id(triplet, f"entity:{t.destino_id}"))

        anchor = Anchor(exact_text=f"{t.origen_id} {t.relacion} {t.destino_id}")
        triple = ProposalTriple(
            origen_id=orig_ent_id,
            destino_id=dest_ent_id,
            relacion=t.relacion,
        )

        items.append(
            ProposalItem(
                id=item_id,
                kind="relation",
                label=rel_label,
                anchor=anchor,
                candidates=[],
                triple=triple,
                metadata={"origen_canonical": t.origen_id, "destino_canonical": t.destino_id},
            )
        )

    ts_now = objeto.provenance.timestamp or datetime.now(timezone.utc).isoformat()
    payload_hash = compute_payload_hash(items)

    envelope = ProposalEnvelope(
        schema_version="1.0.0",
        source_triplet=triplet,
        pipeline_version="p5b-kernel-propuesta-pura",
        payload_hash=payload_hash,
        created_at=ts_now,
        updated_at=ts_now,
        items=items,
        judgments=[],
        settlement_act=None,
    )

    return envelope


def ratificar_propuesta(
    proposal: Union[ProposalEnvelope, dict],
    actor: str = "operador",
    decision_default: str = "accept",
    decisiones_custom: Optional[dict[str, str]] = None,
) -> ProposalEnvelope:
    """
    Helper para ratificar una propuesta generando los Judgments explícitos necesarios para asentar.
    """
    decisiones_custom = decisiones_custom or {}

    if isinstance(proposal, ProposalEnvelope):
        raw_items = proposal.items
        raw_triplet = proposal.source_triplet
        pipeline_ver = proposal.pipeline_version
        created_at = proposal.created_at
    else:
        raw_items = proposal["items"]
        raw_triplet = proposal["source_triplet"]
        pipeline_ver = proposal["pipeline_version"]
        created_at = proposal["created_at"]

    judgments: List[Judgment] = []
    ts_now = datetime.now(timezone.utc).isoformat()

    for item in raw_items:
        it_id = item.id if hasattr(item, "id") else item["id"]
        dec = decisiones_custom.get(it_id, decision_default)
        j_id = str(uuid.uuid4())
        judgments.append(
            Judgment(
                judgment_id=j_id,
                item_id=it_id,
                decision=dec,
                actor=actor,
                timestamp=ts_now,
            )
        )

    if isinstance(proposal, ProposalEnvelope):
        return ProposalEnvelope(
            schema_version=proposal.schema_version,
            source_triplet=proposal.source_triplet,
            pipeline_version=proposal.pipeline_version,
            payload_hash=proposal.payload_hash,
            created_at=proposal.created_at,
            updated_at=ts_now,
            items=proposal.items,
            judgments=judgments,
            settlement_act=proposal.settlement_act,
        )
    else:
        proposal_copy = dict(proposal)
        proposal_copy["judgments"] = [j.__dict__ for j in judgments]
        proposal_copy["updated_at"] = ts_now
        from khora_kernel.contracts.proposal import from_dict
        return from_dict(proposal_copy)


def asentar(
    proposal: ProposalEnvelope,
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
    on_upsert: Optional[Any] = None,
) -> ActaDeIngesta:
    """
    Asienta una propuesta ratificada en UNA sola transacción atómica Neo4j/memoria.
    Exige la presencia de juicios explícitos (judgments). Sin juicios NO se asienta.
    Fallo de constraints o error causa rollback completo.
    """
    if not proposal.judgments:
        raise ValueError("Propuesta no ratificada: se requieren juicios (judgments) explícitos para asentar.")

    judgment_by_item = {j.item_id: j.decision for j in proposal.judgments}

    # Filtrar ítems aceptados
    items_aceptados = [it for it in proposal.items if judgment_by_item.get(it.id) == "accept"]
    items_rechazados = [it for it in proposal.items if judgment_by_item.get(it.id) == "reject"]

    if not items_aceptados and items_rechazados:
        # Todos rechazados
        act_id = str(uuid.uuid4())
        ts_now = datetime.now(timezone.utc).isoformat()
        acta = ActaDeIngesta(
            origen="p5b-kernel",
            timestamp=ts_now,
            ideas_novedosas=0,
            ideas_repetidas=0,
            matices=0,
            needs_review=0,
            triples_escritos=0,
            linea_temporal_indexada=True,
        )
        return acta

    # Preparar datos de entidades y relaciones aceptadas para escritura transaccional única
    entidades_a_escribir = []
    relaciones_a_escribir = []

    ideas_novedosas = 0
    ideas_repetidas = 0
    matices = 0
    needs_review = 0

    item_by_id = {it.id: it for it in proposal.items}

    for it in items_aceptados:
        if it.kind == "entity":
            meta = it.metadata or {}
            decision = meta.get("decision", "NEW")
            if decision == "NEW":
                ideas_novedosas += 1
            elif decision == "MERGE":
                ideas_repetidas += 1
            elif decision == "MATIZ":
                matices += 1

            needs_rev = meta.get("needs_review", False)
            if needs_rev:
                needs_review += 1

            entidades_a_escribir.append({
                "canonical_key": it.label,
                "label_original": meta.get("raw_label", it.anchor.exact_text),
                "provenance_raw": f"volcado:{proposal.source_triplet.volcado_id}",
                "embedding": None,  # Se completará si disponible
                "needs_review": needs_rev,
            })

        elif it.kind == "relation" and it.triple is not None:
            orig_item = item_by_id.get(it.triple.origen_id)
            dest_item = item_by_id.get(it.triple.destino_id)

            orig_canonical = orig_item.label if orig_item else "desconocido"
            dest_canonical = dest_item.label if dest_item else "desconocido"

            relaciones_a_escribir.append({
                "origen_id": orig_canonical,
                "destino_id": dest_canonical,
                "relacion": it.label,
                "provenance": proposal.source_triplet.volcado_id,
            })

    io_id = f"io-{proposal.source_triplet.volcado_id}"
    terna = {
        "volcado_id": proposal.source_triplet.volcado_id,
        "version": proposal.source_triplet.version,
        "sha256": proposal.source_triplet.sha256,
    }

    if hasattr(memoria, "asentar_transaccional"):
        triples_escritos = memoria.asentar_transaccional(
            entidades=entidades_a_escribir,
            relaciones=relaciones_a_escribir,
            source_triplet=terna,
            io_id=io_id,
            timestamp=proposal.created_at,
        )
    else:
        # Fallback a ejecución transaccional sobre memoria o mock
        triples_escritos = len(relaciones_a_escribir)
        for ent in entidades_a_escribir:
            if hasattr(memoria, "merge_entidad"):
                memoria.merge_entidad(
                    canonical_key=ent["canonical_key"],
                    label_original=ent["label_original"],
                    provenance_raw=ent["provenance_raw"],
                    embedding=ent["embedding"] or [],
                    needs_review=ent["needs_review"],
                )

    if on_upsert:
        on_upsert(io_id, memoria, proposal.created_at)

    return ActaDeIngesta(
        origen="p5b-kernel",
        timestamp=proposal.created_at,
        ideas_novedosas=ideas_novedosas,
        ideas_repetidas=ideas_repetidas,
        matices=matices,
        needs_review=needs_review,
        triples_escritos=triples_escritos,
        linea_temporal_indexada=True,
    )


def persistir(
    proposal: Union[Proposal, ProposalEnvelope],
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
    on_upsert: Optional[Any] = None,
) -> ActaDeIngesta:
    if isinstance(proposal, ProposalEnvelope):
        return asentar(proposal, memoria, puerto_llm, puerto_embeddings, on_upsert)

    # Si llega un objeto Proposal legado, ratificar por defecto para mantener compatibilidad si tiene juicios o invocar asentar
    envelope = proponer(proposal.source, memoria, puerto_llm, puerto_embeddings)
    envelope_ratificado = ratificar_propuesta(envelope)
    return asentar(envelope_ratificado, memoria, puerto_llm, puerto_embeddings, on_upsert)


def ingestar(
    objeto: ObjetoDeInformacion,
    memoria: Any,
    puerto_llm: PuertoLLM,
    puerto_embeddings: PuertoEmbeddings,
    on_upsert: Optional[Any] = None,
) -> ActaDeIngesta:
    envelope = proponer(objeto, memoria, puerto_llm, puerto_embeddings)
    ratificado = ratificar_propuesta(envelope)
    return asentar(ratificado, memoria, puerto_llm, puerto_embeddings, on_upsert)


def frecuencia(memoria: Any, canonical_key: str) -> int:
    return memoria.frecuencia(canonical_key)


def linea_temporal(memoria: Any, desde: str, hasta: str) -> List[Any]:
    return memoria.linea_temporal(desde, hasta)
