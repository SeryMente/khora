import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ProposalEnvelope,
  ProposalItem,
  SourceTriplet,
  computeItemId,
  computePayloadHash,
  validateProposalEnvelope,
  CURRENT_SCHEMA_VERSION,
} from "../../lib/contracts/proposal";

const SAMPLE_TRIPLET: SourceTriplet = {
  volcado_id: "a1b2c3d4-e5f6-47a8-b9c0-112233445566",
  version: 1,
  sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
};

function createValidEnvelope(): ProposalEnvelope {
  const itemId = computeItemId(SAMPLE_TRIPLET, "entity-0");
  const items: ProposalItem[] = [
    {
      id: itemId,
      kind: "entity",
      label: "Concepto Alpha",
      anchor: {
        exact_text: "Concepto Alpha",
        start_char: 0,
        end_char: 14,
        segment_index: 0,
      },
      candidates: [
        {
          canonical_key: "concepto_alpha",
          score: 0.95,
          label: "Concepto Alpha",
          needs_review: false,
        },
      ],
      metadata: { tipo: "concepto" },
    },
  ];

  const payloadHash = computePayloadHash(items);

  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    source_triplet: SAMPLE_TRIPLET,
    pipeline_version: "5b-v1.0.0",
    payload_hash: payloadHash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items,
    judgments: [],
    settlement_act: null,
  };
}

test("proposal_contract: valid envelope passes validation", () => {
  const env = createValidEnvelope();
  const res = validateProposalEnvelope(env);
  assert.equal(res.valid, true, `Validation failed unexpectedly: ${res.errors.join(", ")}`);
  assert.equal(res.errors.length, 0);
});

test("proposal_contract: FAILS on incomplete source triplet", () => {
  const env = createValidEnvelope() as any;

  // Test missing volcado_id
  env.source_triplet = { version: 1, sha256: SAMPLE_TRIPLET.sha256 };
  let res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("volcado_id")));

  // Test version < 1
  env.source_triplet = { volcado_id: SAMPLE_TRIPLET.volcado_id, version: 0, sha256: SAMPLE_TRIPLET.sha256 };
  res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("version")));

  // Test invalid sha256 length
  env.source_triplet = { volcado_id: SAMPLE_TRIPLET.volcado_id, version: 1, sha256: "short_sha" };
  res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("sha256")));
});

test("proposal_contract: FAILS on altered payload hash", () => {
  const env = createValidEnvelope();
  // Alter hash string
  env.payload_hash = "f".repeat(64);
  const res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("Integridad alterada")));
});

test("proposal_contract: FAILS on invalid anchor", () => {
  const env = createValidEnvelope();

  // Test empty exact_text
  env.items[0].anchor.exact_text = "";
  // Recompute payload hash for modified items to isolate anchor validation failure
  env.payload_hash = computePayloadHash(env.items);

  let res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("anchor.exact_text")));

  // Test negative start_char
  env.items[0].anchor.exact_text = "Valid text";
  env.items[0].anchor.start_char = -5;
  env.payload_hash = computePayloadHash(env.items);

  res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("start_char")));
});

test("proposal_contract: FAILS on unknown schema version", () => {
  const env = createValidEnvelope();
  env.schema_version = "9.0.0";
  const res = validateProposalEnvelope(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("Versión de esquema desconocida")));
});

test("proposal_contract: Judgment Zone modifications do NOT alter or invalidate payload_hash", () => {
  const env = createValidEnvelope();
  const initialHash = env.payload_hash;

  // Add judgment and settlement act (Judgment Zone)
  env.judgments.push({
    judgment_id: "b2c3d4e5-f6a7-48b9-c0d1-223344556677",
    item_id: env.items[0].id,
    decision: "accept",
    actor: "operador@khora.io",
    timestamp: new Date().toISOString(),
  });

  env.settlement_act = {
    act_id: "c3d4e5f6-a7b8-49c0-d1e2-334455667788",
    status: "approved",
    settled_at: new Date().toISOString(),
    settled_by: "operador@khora.io",
    summary: "Aprobación de prueba",
  };

  // Re-validate
  const res = validateProposalEnvelope(env);
  assert.equal(res.valid, true, `Validation failed: ${res.errors.join(", ")}`);
  assert.equal(env.payload_hash, initialHash);
});

test("proposal_contract: computeItemId produces deterministic UUIDv5", () => {
  const id1 = computeItemId(SAMPLE_TRIPLET, "item-alpha");
  const id2 = computeItemId(SAMPLE_TRIPLET, "item-alpha");
  const id3 = computeItemId(SAMPLE_TRIPLET, "item-beta");

  assert.equal(id1, id2);
  assert.notEqual(id1, id3);
  assert.ok(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id1));
});
