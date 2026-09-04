# @l0 L0-002-R · @req ING-03/REQ-CONTRACT
"""
Contrato de Propuestas (ProposalEnvelope) - Kernel Python.
Define los esquemas y validadores para la zona derivada y la zona de juicio.
Cumple estrictamente con ADR-010 y check_stdlib_only.py (solo stdlib).
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid

CURRENT_SCHEMA_VERSION = "1.0.0"
KHORA_PROPOSAL_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

UUID_REGEX = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
SHA256_REGEX = re.compile(r"^[0-9a-fA-F]{64}$")


@dataclass(frozen=True)
class SourceTriplet:
    volcado_id: str
    version: int
    sha256: str


@dataclass(frozen=True)
class Anchor:
    exact_text: str
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    segment_index: Optional[int] = None


@dataclass(frozen=True)
class ResolutionCandidate:
    canonical_key: str
    score: float
    label: str
    needs_review: bool


@dataclass(frozen=True)
class ProposalTriple:
    origen_id: str
    destino_id: str
    relacion: str


@dataclass(frozen=True)
class ProposalItem:
    id: str
    kind: str  # "entity" | "relation"
    label: str
    anchor: Anchor
    candidates: List[ResolutionCandidate]
    triple: Optional[ProposalTriple] = None
    metadata: Optional[Dict[str, str]] = None


@dataclass(frozen=True)
class Judgment:
    judgment_id: str
    item_id: str
    decision: str  # "accept" | "reject" | "modify"
    actor: str
    timestamp: str
    override_data: Optional[Dict[str, Any]] = None


@dataclass(frozen=True)
class SettlementAct:
    act_id: str
    status: str  # "pending" | "approved" | "rejected" | "partially_approved"
    settled_at: str
    settled_by: str
    summary: str


@dataclass(frozen=True)
class ProposalEnvelope:
    schema_version: str
    source_triplet: SourceTriplet
    pipeline_version: str
    payload_hash: str
    created_at: str
    updated_at: str
    items: List[ProposalItem]
    judgments: List[Judgment] = field(default_factory=list)
    settlement_act: Optional[SettlementAct] = None


def compute_item_id(triplet: SourceTriplet, content_key: str) -> str:
    """
    Calcula un UUIDv5 determinista para un ProposalItem basado en la terna fuente y la clave de contenido.
    """
    name = f"{triplet.volcado_id}:{triplet.version}:{triplet.sha256.lower()}:{content_key}"
    return str(uuid.uuid5(KHORA_PROPOSAL_NAMESPACE, name))


def canonicalize_json(obj: Any) -> str:
    """
    Produce una representación en cadena de JSON canónica (claves ordenadas, sin espacios).
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def item_to_canonical_dict(item: Union[ProposalItem, dict]) -> dict:
    if isinstance(item, ProposalItem):
        data = asdict(item)
    elif isinstance(item, dict):
        data = item
    else:
        raise ValueError("Item debe ser dict o ProposalItem")

    # Limpiar None opcionales si no están presentes para coincidir con el schema
    def clean(d: Any) -> Any:
        if isinstance(d, dict):
            res = {}
            for k, v in d.items():
                if v is not None:
                    res[k] = clean(v)
            return res
        if isinstance(d, list):
            return [clean(x) for x in d]
        return d

    return clean(data)


def compute_payload_hash(items: List[Union[ProposalItem, dict]]) -> str:
    """
    Calcula el payload_hash (SHA-256) de la Zona Derivada a partir de los ítems en formato canónico.
    """
    canonical_items = [item_to_canonical_dict(it) for it in items]
    canonical_str = canonicalize_json(canonical_items)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest().lower()


def validate_proposal_envelope(raw: Any) -> Tuple[bool, List[str]]:
    """
    Valida un objeto diccionario o ProposalEnvelope crudo contra el contrato.
    Retorna (es_valido, lista_de_errores).
    """
    errors: List[str] = []

    if not isinstance(raw, dict):
        return False, ["El envelope debe ser un diccionario JSON válido."]

    # 1. Schema version
    schema_ver = raw.get("schema_version")
    if not isinstance(schema_ver, str) or not schema_ver.startswith("1."):
        errors.append(f"Versión de esquema desconocida o incompatible: {schema_ver}.")

    # 2. Source triplet
    triplet = raw.get("source_triplet")
    if not isinstance(triplet, dict):
        errors.append("Terna de procedencia (source_triplet) ausente o no es un objeto.")
    else:
        volcado_id = triplet.get("volcado_id")
        version = triplet.get("version")
        sha256 = triplet.get("sha256")

        if not isinstance(volcado_id, str) or not UUID_REGEX.match(volcado_id):
            errors.append("source_triplet.volcado_id debe ser un UUID válido.")
        if not isinstance(version, int) or isinstance(version, bool) or version < 1:
            errors.append("source_triplet.version debe ser un entero >= 1.")
        if not isinstance(sha256, str) or not SHA256_REGEX.match(sha256):
            errors.append("source_triplet.sha256 debe ser un digest hexadecimal de 64 caracteres.")

    # 3. Pipeline version
    pipeline_ver = raw.get("pipeline_version")
    if not isinstance(pipeline_ver, str) or len(pipeline_ver.strip()) == 0:
        errors.append("pipeline_version es obligatorio y no puede estar vacío.")

    # 4. Timestamps
    created_at = raw.get("created_at")
    updated_at = raw.get("updated_at")
    if not isinstance(created_at, str):
        errors.append("created_at debe ser una cadena ISO 8601 válida.")
    if not isinstance(updated_at, str):
        errors.append("updated_at debe ser una cadena ISO 8601 válida.")

    # 5. Items validation
    items = raw.get("items")
    if not isinstance(items, list):
        errors.append("items debe ser una lista.")
    else:
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                errors.append(f"items[{idx}] debe ser un objeto.")
                continue

            item_id = item.get("id")
            kind = item.get("kind")
            label = item.get("label")
            anchor = item.get("anchor")
            candidates = item.get("candidates")

            if not isinstance(item_id, str) or not UUID_REGEX.match(item_id):
                errors.append(f"items[{idx}].id debe ser un UUID válido.")
            if kind not in ("entity", "relation"):
                errors.append(f"items[{idx}].kind debe ser 'entity' o 'relation'.")
            if not isinstance(label, str) or len(label.strip()) == 0:
                errors.append(f"items[{idx}].label es obligatorio.")

            # Anchor validation
            if not isinstance(anchor, dict):
                errors.append(f"items[{idx}].anchor es obligatorio.")
            else:
                exact_text = anchor.get("exact_text")
                if not isinstance(exact_text, str) or len(exact_text.strip()) == 0:
                    errors.append(f"items[{idx}].anchor.exact_text es obligatorio y no puede estar vacío.")

                start_char = anchor.get("start_char")
                if start_char is not None and (not isinstance(start_char, int) or isinstance(start_char, bool) or start_char < 0):
                    errors.append(f"items[{idx}].anchor.start_char debe ser un entero >= 0.")

                end_char = anchor.get("end_char")
                if end_char is not None and (not isinstance(end_char, int) or isinstance(end_char, bool) or end_char < 0):
                    errors.append(f"items[{idx}].anchor.end_char debe ser un entero >= 0.")

            # Candidates validation
            if not isinstance(candidates, list):
                errors.append(f"items[{idx}].candidates debe ser una lista.")

    # 6. Payload hash integrity verification
    payload_hash = raw.get("payload_hash")
    if not isinstance(payload_hash, str) or not SHA256_REGEX.match(payload_hash):
        errors.append("payload_hash debe ser un digest SHA-256 hexadecimal de 64 caracteres.")
    elif isinstance(items, list):
        try:
            computed_hash = compute_payload_hash(items)
            if payload_hash.lower() != computed_hash:
                errors.append(f"Integridad alterada: payload_hash recibido ({payload_hash}) no coincide con el calculado ({computed_hash}).")
        except Exception as e:
            errors.append(f"Error calculando hash de carga: {str(e)}")

    # 7. Judgments validation
    judgments = raw.get("judgments")
    if not isinstance(judgments, list):
        errors.append("judgments debe ser una lista.")

    # 8. Settlement act validation
    settlement_act = raw.get("settlement_act")
    if settlement_act is not None:
        if not isinstance(settlement_act, dict):
            errors.append("settlement_act debe ser null u objeto.")
        else:
            act_id = settlement_act.get("act_id")
            status = settlement_act.get("status")
            settled_at = settlement_act.get("settled_at")
            settled_by = settlement_act.get("settled_by")
            if not act_id or not status or not settled_at or not settled_by:
                errors.append("settlement_act incompleto: requiere act_id, status, settled_at y settled_by.")

    return len(errors) == 0, errors


def from_dict(data: dict) -> ProposalEnvelope:
    valid, errors = validate_proposal_envelope(data)
    if not valid:
        raise ValueError("Error de validación de ProposalEnvelope:\n" + "\n".join(errors))

    triplet_data = data["source_triplet"]
    triplet = SourceTriplet(
        volcado_id=triplet_data["volcado_id"],
        version=triplet_data["version"],
        sha256=triplet_data["sha256"],
    )

    items: List[ProposalItem] = []
    for item_raw in data["items"]:
        anchor_raw = item_raw["anchor"]
        anchor = Anchor(
            exact_text=anchor_raw["exact_text"],
            start_char=anchor_raw.get("start_char"),
            end_char=anchor_raw.get("end_char"),
            segment_index=anchor_raw.get("segment_index"),
        )
        candidates = [
            ResolutionCandidate(
                canonical_key=c["canonical_key"],
                score=c["score"],
                label=c["label"],
                needs_review=c["needs_review"],
            )
            for c in item_raw.get("candidates", [])
        ]
        triple = None
        if "triple" in item_raw and item_raw["triple"] is not None:
            tr = item_raw["triple"]
            triple = ProposalTriple(
                origen_id=tr["origen_id"],
                destino_id=tr["destino_id"],
                relacion=tr["relacion"],
            )

        items.append(
            ProposalItem(
                id=item_raw["id"],
                kind=item_raw["kind"],
                label=item_raw["label"],
                anchor=anchor,
                candidates=candidates,
                triple=triple,
                metadata=item_raw.get("metadata"),
            )
        )

    judgments: List[Judgment] = []
    for j_raw in data.get("judgments", []):
        judgments.append(
            Judgment(
                judgment_id=j_raw["judgment_id"],
                item_id=j_raw["item_id"],
                decision=j_raw["decision"],
                actor=j_raw["actor"],
                timestamp=j_raw["timestamp"],
                override_data=j_raw.get("override_data"),
            )
        )

    settlement_act = None
    act_raw = data.get("settlement_act")
    if act_raw is not None:
        settlement_act = SettlementAct(
            act_id=act_raw["act_id"],
            status=act_raw["status"],
            settled_at=act_raw["settled_at"],
            settled_by=act_raw["settled_by"],
            summary=act_raw["summary"],
        )

    return ProposalEnvelope(
        schema_version=data["schema_version"],
        source_triplet=triplet,
        pipeline_version=data["pipeline_version"],
        payload_hash=data["payload_hash"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
        items=items,
        judgments=judgments,
        settlement_act=settlement_act,
    )
