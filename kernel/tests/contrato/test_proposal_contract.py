from datetime import datetime, timezone

from khora_kernel.contracts import (
    CURRENT_SCHEMA_VERSION,
    ProposalEnvelope,
    SourceTriplet,
    compute_item_id,
    compute_payload_hash,
    from_dict,
    validate_proposal_envelope,
)

SAMPLE_TRIPLET = SourceTriplet(
    volcado_id="a1b2c3d4-e5f6-47a8-b9c0-112233445566",
    version=1,
    sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
)


def create_valid_envelope_dict() -> dict:
    item_id = compute_item_id(SAMPLE_TRIPLET, "entity-0")
    items = [
        {
            "id": item_id,
            "kind": "entity",
            "label": "Concepto Alpha",
            "anchor": {
                "exact_text": "Concepto Alpha",
                "start_char": 0,
                "end_char": 14,
                "segment_index": 0,
            },
            "candidates": [
                {
                    "canonical_key": "concepto_alpha",
                    "score": 0.95,
                    "label": "Concepto Alpha",
                    "needs_review": False,
                }
            ],
            "metadata": {"tipo": "concepto"},
        }
    ]

    payload_hash = compute_payload_hash(items)
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "source_triplet": {
            "volcado_id": SAMPLE_TRIPLET.volcado_id,
            "version": SAMPLE_TRIPLET.version,
            "sha256": SAMPLE_TRIPLET.sha256,
        },
        "pipeline_version": "5b-v1.0.0",
        "payload_hash": payload_hash,
        "created_at": now_iso,
        "updated_at": now_iso,
        "items": items,
        "judgments": [],
        "settlement_act": None,
    }


def test_valid_proposal_envelope():
    raw = create_valid_envelope_dict()
    valid, errors = validate_proposal_envelope(raw)
    assert valid, f"Validación falló inesperadamente: {errors}"
    assert len(errors) == 0

    envelope = from_dict(raw)
    assert isinstance(envelope, ProposalEnvelope)
    assert envelope.source_triplet.volcado_id == SAMPLE_TRIPLET.volcado_id
    assert len(envelope.items) == 1


def test_fails_on_incomplete_source_triplet():
    raw = create_valid_envelope_dict()

    # Missing volcado_id
    raw["source_triplet"] = {
        "version": 1,
        "sha256": SAMPLE_TRIPLET.sha256,
    }
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("volcado_id" in e for e in errors)

    # Version < 1
    raw["source_triplet"] = {
        "volcado_id": SAMPLE_TRIPLET.volcado_id,
        "version": 0,
        "sha256": SAMPLE_TRIPLET.sha256,
    }
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("version" in e for e in errors)

    # Invalid SHA256 length
    raw["source_triplet"] = {
        "volcado_id": SAMPLE_TRIPLET.volcado_id,
        "version": 1,
        "sha256": "invalid_sha",
    }
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("sha256" in e for e in errors)


def test_fails_on_altered_payload_hash():
    raw = create_valid_envelope_dict()
    raw["payload_hash"] = "f" * 64
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("Integridad alterada" in e for e in errors)


def test_fails_on_invalid_anchor():
    raw = create_valid_envelope_dict()

    # Empty exact_text
    raw["items"][0]["anchor"]["exact_text"] = ""
    raw["payload_hash"] = compute_payload_hash(raw["items"])
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("anchor.exact_text" in e for e in errors)

    # Negative start_char
    raw["items"][0]["anchor"]["exact_text"] = "Valid text"
    raw["items"][0]["anchor"]["start_char"] = -1
    raw["payload_hash"] = compute_payload_hash(raw["items"])
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("start_char" in e for e in errors)


def test_fails_on_unknown_schema_version():
    raw = create_valid_envelope_dict()
    raw["schema_version"] = "9.0.0"
    valid, errors = validate_proposal_envelope(raw)
    assert not valid
    assert any("Versión de esquema desconocida" in e for e in errors)


def test_judgment_zone_does_not_alter_payload_hash():
    raw = create_valid_envelope_dict()
    initial_hash = raw["payload_hash"]

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["judgments"].append({
        "judgment_id": "b2c3d4e5-f6a7-48b9-c0d1-223344556677",
        "item_id": raw["items"][0]["id"],
        "decision": "accept",
        "actor": "operador@khora.io",
        "timestamp": now_iso,
    })

    raw["settlement_act"] = {
        "act_id": "c3d4e5f6-a7b8-49c0-d1e2-334455667788",
        "status": "approved",
        "settled_at": now_iso,
        "settled_by": "operador@khora.io",
        "summary": "Aprobado",
    }

    valid, errors = validate_proposal_envelope(raw)
    assert valid, f"Validación falló: {errors}"
    assert raw["payload_hash"] == initial_hash


def test_compute_item_id_deterministic():
    id1 = compute_item_id(SAMPLE_TRIPLET, "item-alpha")
    id2 = compute_item_id(SAMPLE_TRIPLET, "item-alpha")
    id3 = compute_item_id(SAMPLE_TRIPLET, "item-beta")

    assert id1 == id2
    assert id1 != id3
    assert len(id1) == 36
