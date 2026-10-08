import test from "node:test";
import assert from "node:assert/strict";
import { signJwt } from "@/lib/server/jwt";
import { applyNormativePrinciple, assertNormativeTurnOpen, verifyNormativeTurn, sameRecordedAttempt } from "@/lib/server/mcp-normative";
import { REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM, type NormativeRuntimeContext } from "@/lib/server/normative-runtime";
import { buildCycleVerificationRecord } from "@/lib/server/norm-check";
import { resetDbForTesting, setDbForTesting } from "@/lib/server/neon";


process.env.PLAYWRIGHT_TEST_RUN = "1";

const actor = "test@example.com";
const cycleId = "test-conversation/T1";
const nonce = "nonce-12345678901234567890123456789012";
const siCommitSha = "a".repeat(40);
const siSha256 = "si-sha256";
const manifestSha256 = "manifest-sha256";
const runtime: NormativeRuntimeContext = {
  platform: REQUIRED_PLATFORM,
  reasoning_mode: "THINKING",
  output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
};

function makeToken(overrides: Record<string, unknown> = {}) {
  return signJwt(
    {
      iss: "http://localhost:3000",
      sub: actor,
      aud: "http://localhost:3000/api/mcp",
      scope: "norm:turn",
      gen: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      jti: "jti-test",
      token_kind: "norm-turn",
      turn_cycle_id: cycleId,
      turn_attempt: 1,
      turn_nonce: nonce,
      turn_si_git_commit_sha: siCommitSha,
      turn_si_sha256: siSha256,
      turn_manifest_sha256: manifestSha256,
      turn_platform: REQUIRED_PLATFORM,
      turn_reasoning_mode: "THINKING",
      turn_output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
      ...overrides,
    } as any,
    "test-jwt-secret-min-32-chars-long",
  );
}

function setMockTurn(overrides: Record<string, unknown> = {}) {
  const turn = {
    cycle_id: cycleId,
    conversation_id: "test-conversation",
    turn_number: 1,
    actor,
    platform: REQUIRED_PLATFORM,
    reasoning_mode: "THINKING",
    output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
    current_attempt: 1,
    status: "OPEN",
    nonce,
    si_version: "v1.0.0",
    si_git_commit_sha: siCommitSha,
    si_git_blob_sha: "blob-sha",
    si_sha256: siSha256,
    manifest_sha256: manifestSha256,
    manifest: [],
    application_index: 0,
    application_vector: [],
    opened_at: new Date().toISOString(),
    closed_at: null,
    verified_attempt: null,
    ...overrides,
  };

  setDbForTesting({
    query: async (sql: string) => {
      if (sql.includes("SELECT generacion FROM mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 1 }] };
      }
      if (sql.includes("FROM normative_turns WHERE cycle_id")) {
        return { rowCount: 1, rows: [turn] };
      }
      return { rowCount: 0, rows: [] };
    },
  });
}

test("normative gate accepts a valid open turn token bound to its snapshot", async () => {
  setMockTurn();
  try {
    const row = await assertNormativeTurnOpen(actor, makeToken(), runtime);
    assert.equal(row.cycle_id, cycleId);
    assert.equal(row.status, "OPEN");
  } finally {
    resetDbForTesting();
  }
});

test("normative gate rejects a closed turn", async () => {
  setMockTurn({ status: "CLOSED" });
  try {
    await assert.rejects(
      assertNormativeTurnOpen(actor, makeToken(), runtime),
      /TURN_NOT_OPEN/,
    );
  } finally {
    resetDbForTesting();
  }
});

test("normative gate rejects a token with mismatched snapshot", async () => {
  setMockTurn();
  try {
    await assert.rejects(
      assertNormativeTurnOpen(actor, makeToken({ turn_si_sha256: "wrong" }), runtime),
      /TURN_TOKEN_STATE_MISMATCH/,
    );
  } finally {
    resetDbForTesting();
  }
});

test("normative gate rejects a token after global revocation", async () => {
  setDbForTesting({
    query: async (sql: string) => {
      if (sql.includes("SELECT generacion FROM mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 2 }] };
      }
      if (sql.includes("FROM normative_turns WHERE cycle_id")) {
        return {
          rowCount: 1,
          rows: [{
            cycle_id: cycleId,
            conversation_id: "test-conversation",
            turn_number: 1,
            actor,
            platform: REQUIRED_PLATFORM,
            reasoning_mode: "THINKING",
            output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
            current_attempt: 1,
            status: "OPEN",
            nonce,
            si_version: "v1.0.0",
            si_git_commit_sha: siCommitSha,
            si_git_blob_sha: "blob-sha",
            si_sha256: siSha256,
            manifest_sha256: manifestSha256,
            manifest: [],
            application_index: 0,
            application_vector: [],
            opened_at: new Date().toISOString(),
            closed_at: null,
            verified_attempt: null,
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  });
  try {
    await assert.rejects(
      assertNormativeTurnOpen(actor, makeToken(), runtime),
      /TURN_TOKEN_REVOKED/,
    );
  } finally {
    resetDbForTesting();
  }
});

test("cycle verification output record preserves cycle, attempt, verdict and evidence", () => {
  const record = buildCycleVerificationRecord({
    cycle_id: cycleId,
    attempt: 2,
    status: "VERIFIED",
    evidence_sha256: "a".repeat(64),
    si_version: "v1.1.0",
    si_git_commit_sha: siCommitSha,
    si_sha256: "b".repeat(64),
    manifest_sha256: "c".repeat(64),
    methodology_version: "v0.12.3",
    methodology_git_commit_sha: "e".repeat(40),
    order_verified: true,
    application_log_sha256: "d".repeat(64),
    verifier_version: "norm-check/0.5.0",
    recorded_at: "2026-10-06T20:00:00.000Z",
    receipt_id: "receipt-1",
  });

  assert.equal(record.schema, "cycle-verification/v1");
  assert.equal(record.cycle_id, cycleId);
  assert.equal(record.attempt, 2);
  assert.equal(record.status, "VERIFIED");
  assert.equal(record.evidence_sha256, "a".repeat(64));
  assert.equal(record.receipt_id, "receipt-1");
  assert.equal(record.methodology_version, "v0.12.3");
  assert.equal(record.methodology_git_commit_sha, "e".repeat(40));
  assert.equal(record.si_git_commit_sha, siCommitSha);
  assert.equal(record.order_verified, true);
  assert.equal(record.application_log_sha256, "d".repeat(64));
});

test("server-side principle application enforces canonical order and builds the complete ledger", async () => {
  const turn = {
    cycle_id: cycleId,
    conversation_id: "test-conversation",
    turn_number: 1,
    actor,
    platform: REQUIRED_PLATFORM,
    reasoning_mode: "THINKING",
    output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
    current_attempt: 1,
    status: "OPEN",
    nonce,
    si_version: "v1.0.0",
    si_git_commit_sha: siCommitSha,
    si_git_blob_sha: "blob-sha",
    si_sha256: siSha256,
    manifest_sha256: manifestSha256,
    manifest: [
      { folio: "P033", preponderance: 100 },
      { folio: "P032", preponderance: 90 },
    ],
    application_index: 0,
    application_vector: [],
    opened_at: new Date().toISOString(),
    closed_at: null,
    verified_attempt: null,
  };

  let persistedIndex = 0;
  const persistedVector: Array<{ folio: string; status: "A" | "N" | "C"; anchor?: string | null; reason_code?: string | null }> = [];
  const client = {
    query: async (sql: string, params: any[]) => {
      if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("FROM normative_turns WHERE cycle_id")) {
        return {
          rowCount: 1,
          rows: [{ ...turn, application_index: persistedIndex, application_vector: [...persistedVector] }],
        };
      }
      if (sql.includes("UPDATE normative_turns SET application_index")) {
        const entry = JSON.parse(params[1])[0];
        persistedVector.push(entry);
        persistedIndex += 1;
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  setDbForTesting({
    connect: async () => client,
    query: async (sql: string) => {
      if (sql.includes("SELECT generacion FROM mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 1 }] };
      }
      return { rowCount: 0, rows: [] };
    },
  });

  try {
    await assert.rejects(
      applyNormativePrinciple(actor, {
        turn_token: makeToken(),
        folio: "P032",
        status: "A",
        anchor: "TestAnchor",
      }),
      /PRINCIPLE_ORDER_MISMATCH/,
    );

    const first = await applyNormativePrinciple(actor, {
      turn_token: makeToken(),
      folio: "P033",
      status: "A",
      anchor: "TestAnchor",
    });
    assert.equal(first.sequence, 1);
    assert.equal(first.total, 2);
    assert.equal(first.complete, false);
    assert.equal((first.next_principle as { folio: string }).folio, "P032");

    const second = await applyNormativePrinciple(actor, {
      turn_token: makeToken(),
      folio: "P032",
      status: "N",
      reason_code: "NOT_APPLICABLE",
    });
    assert.equal(second.sequence, 2);
    assert.equal(second.total, 2);
    assert.equal(second.complete, true);
    assert.equal(second.next_principle, null);

    assert.deepEqual(persistedVector, [
      { folio: "P033", status: "A", anchor: "TestAnchor", reason_code: null },
      { folio: "P032", status: "N", anchor: null, reason_code: "NOT_APPLICABLE" },
    ]);
  } finally {
    resetDbForTesting();
  }
});


test("normative verification rejects replay of a token after the turn is closed", async () => {
  setMockTurn({ status: "CLOSED" });
  try {
    await assert.rejects(
      verifyNormativeTurn(actor, { turn_token: makeToken(), receipt: {} as any }),
      /TURN_TOKEN_REPLAY_AFTER_CLOSE/,
    );
  } finally {
    resetDbForTesting();
  }
});

test("normative attempt idempotency only accepts the exact recorded nonce and evidence", () => {
  assert.equal(
    sameRecordedAttempt(
      { nonce, evidence_sha256: "a".repeat(64) },
      { nonce, evidence_sha256: "a".repeat(64) },
    ),
    true,
  );
  assert.equal(
    sameRecordedAttempt(
      { nonce, evidence_sha256: "a".repeat(64) },
      { nonce: nonce + "-different", evidence_sha256: "a".repeat(64) },
    ),
    false,
  );
  assert.equal(
    sameRecordedAttempt(
      { nonce, evidence_sha256: "a".repeat(64) },
      { nonce, evidence_sha256: "b".repeat(64) },
    ),
    false,
  );
});
