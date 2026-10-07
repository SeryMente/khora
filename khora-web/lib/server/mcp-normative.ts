import { generateRandomToken, obtenerGeneracionRevocacion } from "./oauth";
import { getDb } from "./neon";
import { getMcpConfig } from "./mcp-config";
import { signJwt, verifyJwtDetailed } from "./jwt";
import {
  getCurrentSiSnapshot,
  verifyNormativeReceipt,
  type NormativeReceipt,
  buildCycleVerificationRecord,
} from "./norm-check";

const TURN_TOKEN_KIND = "norm-turn";
const TURN_TTL_SECONDS = 12 * 60 * 60;
const RELEASE_TOKEN_KIND = "norm-release";
const RELEASE_TTL_SECONDS = 5 * 60;

type TurnRow = {
  cycle_id: string;
  conversation_id: string;
  turn_number: number | null;
  actor: string;
  current_attempt: number;
  status: "OPEN" | "CLOSED";
  nonce: string;
  si_version: string;
  si_git_blob_sha: string;
  si_sha256: string;
  manifest_sha256: string;
  manifest: unknown[];
  opened_at: string;
  closed_at: string | null;
  verified_attempt: number | null;
};

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.query(
        "CREATE TABLE IF NOT EXISTS normative_turns (" +
          "cycle_id TEXT PRIMARY KEY," +
          "conversation_id TEXT NOT NULL," +
          "turn_number INTEGER," +
          "actor TEXT NOT NULL," +
          "current_attempt INTEGER NOT NULL CHECK (current_attempt > 0)," +
          "status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED'))," +
          "nonce TEXT NOT NULL UNIQUE," +
          "si_version TEXT NOT NULL," +
          "si_git_blob_sha TEXT NOT NULL," +
          "si_sha256 TEXT NOT NULL," +
          "manifest_sha256 TEXT NOT NULL," +
          "manifest JSONB NOT NULL," +
          "opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()," +
          "closed_at TIMESTAMPTZ," +
          "verified_attempt INTEGER" +
        ");"
      );
      await db.query("CREATE INDEX IF NOT EXISTS normative_turns_opened_at_idx ON normative_turns (opened_at DESC)");
      await db.query("CREATE INDEX IF NOT EXISTS normative_turns_status_idx ON normative_turns (status, opened_at DESC)");
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function validActor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 320;
}

function normalizeConversationId(value?: string): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || /[\u0000-\u001F\u007F]/.test(normalized)) return null;
  return normalized;
}

function normalizeTurnNumber(value?: number): number | null {
  if (value === undefined) return null;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function cycleIdFor(conversationId: string | null, turnNumber: number | null): string {
  if (conversationId && turnNumber !== null) return conversationId + "/T" + turnNumber;
  return "TURN/" + generateRandomToken(16);
}

function issueTurnToken(actor: string, row: Pick<TurnRow,
  "cycle_id" | "current_attempt" | "nonce" | "si_sha256" | "manifest_sha256"
>, config: NonNullable<ReturnType<typeof getMcpConfig>>, gen: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      iss: config.issuer,
      sub: actor,
      aud: config.canonicalUrl,
      scope: "norm:turn",
      gen,
      exp: nowSec + TURN_TTL_SECONDS,
      iat: nowSec,
      jti: generateRandomToken(16),
      token_kind: TURN_TOKEN_KIND,
      turn_cycle_id: row.cycle_id,
      turn_attempt: row.current_attempt,
      turn_nonce: row.nonce,
      turn_si_sha256: row.si_sha256,
      turn_manifest_sha256: row.manifest_sha256,
    },
    config.jwtSecret
  );
}

function tokenFailure(message: string): Error {
  return new Error(message);
}

function issueReleaseToken(actor: string, turn: TurnRow, outputSha256: string, evidenceSha256: string, config: NonNullable<ReturnType<typeof getMcpConfig>>, gen: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      iss: config.issuer,
      sub: actor,
      aud: config.canonicalUrl,
      scope: "norm:turn",
      gen,
      exp: nowSec + RELEASE_TTL_SECONDS,
      iat: nowSec,
      jti: generateRandomToken(16),
      token_kind: RELEASE_TOKEN_KIND,
      turn_cycle_id: turn.cycle_id,
      turn_attempt: turn.current_attempt,
      turn_nonce: turn.nonce,
      turn_output_sha256: outputSha256,
      turn_evidence_sha256: evidenceSha256,
    },
    config.jwtSecret
  );
}

export async function releaseNormativeTurn(actor: string, input: { turn_token: string }) {
  if (!validActor(actor)) throw new Error("TURN_ACTOR_INVALID");
  if (!input || typeof input.turn_token !== "string" || input.turn_token.length < 16) {
    throw new Error("TURN_TOKEN_INVALID");
  }

  await ensureSchema();
  const config = getMcpConfig();
  if (!config) throw new Error("MCP_CONFIG_MISSING");

  const tokenResult = verifyJwtDetailed(input.turn_token, config.jwtSecret);
  if (!tokenResult.ok) throw tokenFailure("TURN_TOKEN_" + tokenResult.error.toUpperCase());
  const token = tokenResult.payload;
  const tokenScopes = token.scope.split(/\s+/).filter(Boolean);

  if (
    token.token_kind !== TURN_TOKEN_KIND ||
    !tokenScopes.includes("norm:turn") ||
    token.iss !== config.issuer ||
    token.aud !== config.canonicalUrl ||
    token.sub !== actor ||
    typeof token.turn_cycle_id !== "string" ||
    typeof token.turn_nonce !== "string" ||
    !Number.isSafeInteger(token.turn_attempt)
  ) {
    throw new Error("TURN_TOKEN_CLAIMS_INVALID");
  }

  const gen = await obtenerGeneracionRevocacion(actor);
  if (token.gen !== gen) throw new Error("TURN_TOKEN_REVOKED");

  const turn = await readTurn(token.turn_cycle_id);
  if (!turn) throw new Error("TURN_NOT_FOUND");
  if (turn.actor !== actor) throw new Error("TURN_ACTOR_MISMATCH");
  if (turn.status !== "CLOSED") throw new Error("TURN_NOT_VERIFIED");
  if (turn.verified_attempt !== turn.current_attempt) throw new Error("TURN_VERIFIED_ATTEMPT_MISMATCH");
  if (token.turn_nonce !== turn.nonce || token.turn_attempt !== turn.current_attempt) {
    throw new Error("TURN_TOKEN_STATE_MISMATCH");
  }

  const db = getDb();
  const receipt = await db.query<{
    status: string;
    output_sha256: string;
    evidence_sha256: string;
  }>(
    "SELECT status, output_sha256, evidence_sha256 FROM normative_receipts WHERE cycle_id = $1 AND attempt = $2 LIMIT 1",
    [turn.cycle_id, turn.verified_attempt]
  );
  const row = receipt.rows[0];
  if (!row || row.status !== "VERIFIED") throw new Error("TURN_VERIFICATION_RECORD_MISSING");

  const releaseToken = issueReleaseToken(actor, turn, row.output_sha256, row.evidence_sha256, config, gen);
  return {
    ok: true,
    status: "VERIFIED_RELEASE",
    cycle_id: turn.cycle_id,
    attempt: turn.current_attempt,
    output_sha256: row.output_sha256,
    evidence_sha256: row.evidence_sha256,
    release_token: releaseToken,
    expires_in_seconds: RELEASE_TTL_SECONDS,
  };
}

async function readTurn(cycleId: string): Promise<TurnRow | null> {
  const db = getDb();
  const result = await db.query<TurnRow>(
    "SELECT cycle_id, conversation_id, turn_number, actor, current_attempt, status, nonce, " +
      "si_version, si_git_blob_sha, si_sha256, manifest_sha256, manifest, opened_at, closed_at, verified_attempt " +
      "FROM normative_turns WHERE cycle_id = $1 LIMIT 1",
    [cycleId]
  );
  return result.rows[0] || null;
}

export async function openNormativeTurn(
  actor: string,
  input: { conversation_id?: string; turn_number?: number }
) {
  if (!validActor(actor)) throw new Error("TURN_ACTOR_INVALID");

  const conversationId = normalizeConversationId(input.conversation_id);
  const turnNumber = normalizeTurnNumber(input.turn_number);
  if ((input.conversation_id && conversationId === null) || (input.turn_number !== undefined && turnNumber === null)) {
    throw new Error("TURN_ID_INVALID");
  }
  if ((conversationId === null) !== (turnNumber === null)) {
    throw new Error("TURN_ID_INCOMPLETE");
  }

  await ensureSchema();
  const db = getDb();
  const config = getMcpConfig();
  if (!config) throw new Error("MCP_CONFIG_MISSING");

  const cycleId = cycleIdFor(conversationId, turnNumber);
  const existing = await readTurn(cycleId);
  if (existing) {
    if (existing.actor !== actor) throw new Error("TURN_ACTOR_MISMATCH");
    if (existing.status === "CLOSED") throw new Error("TURN_ALREADY_CLOSED");

    const gen = await obtenerGeneracionRevocacion(actor);
    return {
      ok: true,
      reused: true,
      turn: {
        cycle_id: existing.cycle_id,
        attempt: existing.current_attempt,
        nonce: existing.nonce,
        turn_token: issueTurnToken(actor, existing, config, gen),
        status: existing.status,
        opened_at: existing.opened_at,
      },
      snapshot: {
        version: existing.si_version,
        git_blob_sha: existing.si_git_blob_sha,
        sha256: existing.si_sha256,
        manifest_sha256: existing.manifest_sha256,
        principles: existing.manifest,
      },
      verifier: {
        protocol: "NORM-CHECK",
        protocol_version: "v0.3.0",
        verifier_version: "norm-check/0.3.0",
      },
    };
  }

  const snapshot = await getCurrentSiSnapshot();
  const nonce = generateRandomToken(32);
  const gen = await obtenerGeneracionRevocacion(actor);

  const inserted = await db.query<TurnRow>(
    "INSERT INTO normative_turns (" +
      "cycle_id, conversation_id, turn_number, actor, current_attempt, status, nonce, " +
      "si_version, si_git_blob_sha, si_sha256, manifest_sha256, manifest" +
      ") VALUES ($1,$2,$3,$4,1,'OPEN',$5,$6,$7,$8,$9,$10) " +
      "ON CONFLICT (cycle_id) DO NOTHING " +
      "RETURNING cycle_id, conversation_id, turn_number, actor, current_attempt, status, nonce, " +
      "si_version, si_git_blob_sha, si_sha256, manifest_sha256, manifest, opened_at, closed_at, verified_attempt",
    [
      cycleId,
      conversationId || cycleId,
      turnNumber,
      actor,
      nonce,
      snapshot.version,
      snapshot.gitBlobSha,
      snapshot.sha256,
      snapshot.manifestSha256,
      JSON.stringify(snapshot.manifest),
    ]
  );

  const row = inserted.rows[0] || await readTurn(cycleId);
  if (!row) throw new Error("TURN_CREATE_FAILED");
  if (row.actor !== actor) throw new Error("TURN_ACTOR_MISMATCH");
  if (row.status !== "OPEN") throw new Error("TURN_ALREADY_CLOSED");

  return {
    ok: true,
    reused: false,
    turn: {
      cycle_id: row.cycle_id,
      attempt: row.current_attempt,
      nonce: row.nonce,
      turn_token: issueTurnToken(actor, row, config, gen),
      status: row.status,
      opened_at: row.opened_at,
    },
    snapshot: {
      version: row.si_version,
      git_blob_sha: row.si_git_blob_sha,
      sha256: row.si_sha256,
      manifest_sha256: row.manifest_sha256,
      principles: row.manifest,
    },
    verifier: {
      protocol: "NORM-CHECK",
      protocol_version: "v0.2.0",
      verifier_version: "norm-check/0.2.0",
    },
  };
}

export async function assertNormativeTurnOpen(actor: string, turnToken: string) {
  if (!validActor(actor)) throw new Error("TURN_ACTOR_INVALID");
  if (typeof turnToken !== "string" || turnToken.length < 16) throw new Error("TURN_TOKEN_INVALID");

  const config = getMcpConfig();
  if (!config) throw new Error("MCP_CONFIG_MISSING");
  const tokenResult = verifyJwtDetailed(turnToken, config.jwtSecret);
  if (!tokenResult.ok) throw tokenFailure("TURN_TOKEN_" + tokenResult.error.toUpperCase());

  const token = tokenResult.payload;
  const tokenScopes = token.scope.split(/\s+/).filter(Boolean);
  if (
    token.token_kind !== TURN_TOKEN_KIND ||
    !tokenScopes.includes("norm:turn") ||
    token.iss !== config.issuer ||
    token.aud !== config.canonicalUrl ||
    token.sub !== actor ||
    typeof token.turn_cycle_id !== "string" ||
    typeof token.turn_nonce !== "string" ||
    !Number.isSafeInteger(token.turn_attempt) ||
    typeof token.turn_si_sha256 !== "string" ||
    typeof token.turn_manifest_sha256 !== "string"
  ) throw new Error("TURN_TOKEN_CLAIMS_INVALID");

  const gen = await obtenerGeneracionRevocacion(actor);
  if (token.gen !== gen) throw new Error("TURN_TOKEN_REVOKED");

  const turn = await readTurn(token.turn_cycle_id);
  if (!turn) throw new Error("TURN_NOT_FOUND");
  if (turn.actor !== actor) throw new Error("TURN_ACTOR_MISMATCH");
  if (turn.status !== "OPEN") throw new Error("TURN_NOT_OPEN");
  if (
    token.turn_nonce !== turn.nonce ||
    token.turn_attempt !== turn.current_attempt ||
    token.turn_si_sha256 !== turn.si_sha256 ||
    token.turn_manifest_sha256 !== turn.manifest_sha256
  ) throw new Error("TURN_TOKEN_STATE_MISMATCH");

  return turn;
}

export async function verifyNormativeTurn(
  actor: string,
  input: { turn_token: string; receipt: NormativeReceipt }
) {
  if (!validActor(actor)) throw new Error("TURN_ACTOR_INVALID");
  if (!input || typeof input.turn_token !== "string" || input.turn_token.length < 16) {
    throw new Error("TURN_TOKEN_INVALID");
  }

  await ensureSchema();
  const config = getMcpConfig();
  if (!config) throw new Error("MCP_CONFIG_MISSING");

  const tokenResult = verifyJwtDetailed(input.turn_token, config.jwtSecret);
  if (!tokenResult.ok) throw tokenFailure("TURN_TOKEN_" + tokenResult.error.toUpperCase());

  const token = tokenResult.payload;
  const tokenScopes = token.scope.split(/\s+/).filter(Boolean);
  if (
    token.token_kind !== TURN_TOKEN_KIND ||
    !tokenScopes.includes("norm:turn") ||
    token.iss !== config.issuer ||
    token.aud !== config.canonicalUrl ||
    token.sub !== actor ||
    typeof token.turn_cycle_id !== "string" ||
    typeof token.turn_nonce !== "string" ||
    !Number.isSafeInteger(token.turn_attempt) ||
    typeof token.turn_si_sha256 !== "string" ||
    typeof token.turn_manifest_sha256 !== "string"
  ) {
    throw new Error("TURN_TOKEN_CLAIMS_INVALID");
  }

  const gen = await obtenerGeneracionRevocacion(actor);
  if (token.gen !== gen) throw new Error("TURN_TOKEN_REVOKED");

  const turn = await readTurn(token.turn_cycle_id);
  if (!turn) throw new Error("TURN_NOT_FOUND");
  if (turn.actor !== actor) throw new Error("TURN_ACTOR_MISMATCH");

  if (turn.status === "CLOSED") {
    const db = getDb();
    const existingReceipt = await db.query(
      "SELECT id, status, integrity, coverage_expected, coverage_evaluated, coverage_missing, " +
        "coverage_duplicates, coverage_unknown, reasons, si_version, si_sha256, manifest_sha256, " +
        "evidence_sha256, verifier_version, created_at " +
        "FROM normative_receipts WHERE cycle_id = $1 AND attempt = $2 LIMIT 1",
      [turn.cycle_id, token.turn_attempt]
    );
    if (existingReceipt.rows[0]) {
      return {
        ok: existingReceipt.rows[0].status === "VERIFIED",
        id: existingReceipt.rows[0].id,
        stored: true,
        idempotent: true,
        closed: true,
        result: existingReceipt.rows[0],
        verification_record: buildCycleVerificationRecord({
          cycle_id: turn.cycle_id,
          attempt: token.turn_attempt,
          status: existingReceipt.rows[0].status,
          evidence_sha256: existingReceipt.rows[0].evidence_sha256,
          si_version: existingReceipt.rows[0].si_version,
          si_sha256: existingReceipt.rows[0].si_sha256,
          manifest_sha256: existingReceipt.rows[0].manifest_sha256,
          verifier_version: existingReceipt.rows[0].verifier_version,
          recorded_at: existingReceipt.rows[0].created_at,
          receipt_id: existingReceipt.rows[0].id,
        }),
      };
    }
    throw new Error("TURN_ALREADY_CLOSED");
  }

  if (
    token.turn_nonce !== turn.nonce ||
    token.turn_attempt !== turn.current_attempt ||
    token.turn_si_sha256 !== turn.si_sha256 ||
    token.turn_manifest_sha256 !== turn.manifest_sha256
  ) {
    throw new Error("TURN_TOKEN_STATE_MISMATCH");
  }

  const receipt = input.receipt;
  if (!receipt || receipt.cycle?.id !== turn.cycle_id) throw new Error("TURN_RECEIPT_CYCLE_MISMATCH");
  if (receipt.cycle.attempt !== turn.current_attempt) throw new Error("TURN_RECEIPT_ATTEMPT_MISMATCH");
  if (receipt.nonce !== turn.nonce) throw new Error("TURN_RECEIPT_NONCE_MISMATCH");
  if (receipt.si?.sha256 !== turn.si_sha256 || receipt.si?.manifest_sha256 !== turn.manifest_sha256) {
    throw new Error("TURN_RECEIPT_SNAPSHOT_MISMATCH");
  }

  const result = await verifyNormativeReceipt(receipt);

  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const locked = await client.query<TurnRow>(
      "SELECT cycle_id, conversation_id, turn_number, actor, current_attempt, status, nonce, " +
        "si_version, si_git_blob_sha, si_sha256, manifest_sha256, manifest, opened_at, closed_at, verified_attempt " +
        "FROM normative_turns WHERE cycle_id = $1 FOR UPDATE",
      [turn.cycle_id]
    );
    const current = locked.rows[0];
    if (!current) throw new Error("TURN_NOT_FOUND");
    if (current.status === "CLOSED") throw new Error("TURN_ALREADY_CLOSED");
    if (current.current_attempt !== receipt.cycle.attempt) throw new Error("TURN_ATTEMPT_CHANGED");

    const insert = await client.query(
      "INSERT INTO normative_receipts (" +
        "cycle_id, attempt, protocol, protocol_version, si_version, si_git_blob_sha, si_sha256, " +
        "manifest_sha256, input_sha256, nonce, output_sha256, evidence_sha256, status, integrity, " +
        "coverage_expected, coverage_evaluated, coverage_missing, coverage_duplicates, coverage_unknown, " +
        "reasons, receipt, verifier_version" +
      ") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) " +
      "RETURNING id, created_at",
      [
        receipt.cycle.id,
        receipt.cycle.attempt,
        receipt.protocol,
        receipt.protocol_version,
        receipt.si.version,
        receipt.si.git_blob_sha,
        receipt.si.sha256,
        receipt.si.manifest_sha256,
        receipt.input_sha256,
        receipt.nonce,
        receipt.output_sha256,
        receipt.evidence_sha256,
        result.status,
        result.integrity,
        result.coverage.expected,
        result.coverage.evaluated,
        result.coverage.missing,
        result.coverage.duplicates,
        result.coverage.unknown,
        JSON.stringify(result.reasons),
        JSON.stringify(receipt),
        "norm-check/0.2.0",
      ]
    );

    if (result.status === "VERIFIED") {
      await client.query(
        "UPDATE normative_turns SET status = 'CLOSED', closed_at = NOW(), verified_attempt = $2 WHERE cycle_id = $1",
        [current.cycle_id, receipt.cycle.attempt]
      );
    } else {
      await client.query(
        "UPDATE normative_turns SET current_attempt = current_attempt + 1 WHERE cycle_id = $1",
        [current.cycle_id]
      );
    }

    await client.query("COMMIT");

    return {
      ok: result.status === "VERIFIED",
      stored: true,
      id: insert.rows[0].id,
      closed: result.status === "VERIFIED",
      next_attempt: result.status === "VERIFIED" ? null : receipt.cycle.attempt + 1,
      result,
      verification_record: buildCycleVerificationRecord({
        cycle_id: receipt.cycle.id,
        attempt: receipt.cycle.attempt,
        status: result.status,
        evidence_sha256: receipt.evidence_sha256,
        si_version: receipt.si.version,
        si_sha256: receipt.si.sha256,
        manifest_sha256: receipt.si.manifest_sha256,
        verifier_version: "norm-check/0.2.0",
        recorded_at: insert.rows[0].created_at,
        receipt_id: insert.rows[0].id,
      }),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      const existing = await db.query(
        "SELECT id, status, integrity, coverage_expected, coverage_evaluated, coverage_missing, " +
          "coverage_duplicates, coverage_unknown, reasons, si_version, si_sha256, manifest_sha256, " +
          "evidence_sha256, verifier_version, created_at " +
          "FROM normative_receipts WHERE cycle_id = $1 AND attempt = $2 LIMIT 1",
        [receipt.cycle.id, receipt.cycle.attempt]
      );
      if (existing.rows[0]) {
        return {
          ok: existing.rows[0].status === "VERIFIED",
          stored: true,
          id: existing.rows[0].id,
          idempotent: true,
          closed: existing.rows[0].status === "VERIFIED",
          result: existing.rows[0],
          verification_record: buildCycleVerificationRecord({
            cycle_id: receipt.cycle.id,
            attempt: receipt.cycle.attempt,
            status: existing.rows[0].status,
            evidence_sha256: existing.rows[0].evidence_sha256,
            si_version: existing.rows[0].si_version,
            si_sha256: existing.rows[0].si_sha256,
            manifest_sha256: existing.rows[0].manifest_sha256,
            verifier_version: existing.rows[0].verifier_version,
            recorded_at: existing.rows[0].created_at,
            receipt_id: existing.rows[0].id,
          }),
        };
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

