import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import {
  getCurrentVerifierInfo,
  NORM_CHECK_VERIFIER_VERSION,
  verifyNormativeReceipt,
  type NormativeReceipt,
} from "@/lib/server/norm-check";

export const runtime = "nodejs";

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.query(
        "CREATE TABLE IF NOT EXISTS normative_receipts (" +
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid()," +
        "cycle_id TEXT NOT NULL," +
        "attempt INTEGER NOT NULL CHECK (attempt > 0)," +
        "protocol TEXT NOT NULL CHECK (protocol = 'NORM-CHECK')," +
        "protocol_version TEXT NOT NULL," +
        "si_version TEXT NOT NULL," +
        "si_git_blob_sha TEXT NOT NULL," +
        "si_sha256 TEXT NOT NULL," +
        "manifest_sha256 TEXT NOT NULL," +
        "input_sha256 TEXT NOT NULL," +
        "nonce TEXT NOT NULL UNIQUE," +
        "output_sha256 TEXT NOT NULL," +
        "evidence_sha256 TEXT NOT NULL," +
        "status TEXT NOT NULL CHECK (status IN ('VERIFIED','INVALID','INCOMPLETE'))," +
        "integrity TEXT NOT NULL CHECK (integrity IN ('PASS','FAIL'))," +
        "coverage_expected INTEGER NOT NULL," +
        "coverage_evaluated INTEGER NOT NULL," +
        "coverage_missing INTEGER NOT NULL," +
        "coverage_duplicates INTEGER NOT NULL DEFAULT 0," +
        "coverage_unknown INTEGER NOT NULL DEFAULT 0," +
        "reasons JSONB NOT NULL DEFAULT '[]'::jsonb," +
        "receipt JSONB NOT NULL," +
        "verifier_version TEXT NOT NULL," +
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()," +
        "UNIQUE (cycle_id, attempt)" +
        ");"
      );
      await db.query("CREATE INDEX IF NOT EXISTS normative_receipts_created_at_idx ON normative_receipts (created_at DESC)");
      await db.query("CREATE INDEX IF NOT EXISTS normative_receipts_cycle_idx ON normative_receipts (cycle_id, attempt DESC)");
      await db.query("CREATE INDEX IF NOT EXISTS normative_receipts_status_idx ON normative_receipts (status, created_at DESC)");
      await db.query("CREATE INDEX IF NOT EXISTS normative_receipts_si_idx ON normative_receipts (si_git_blob_sha)");
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function apiKeyMatches(request: NextRequest): boolean {
  const expected = process.env.KHORA_API_KEY;
  const provided = request.headers.get("x-khora-key");
  if (!expected || !provided || expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}

async function authorize(request: NextRequest, allowApiKey: boolean) {
  if (allowApiKey && apiKeyMatches(request)) return "machine";
  const session = await auth();
  return session ? "user" : null;
}

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!(await authorize(request, false))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: noStore });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const result = await db.query(
        "SELECT id, cycle_id, attempt, protocol, protocol_version, si_version, si_git_blob_sha, " +
        "si_sha256, manifest_sha256, input_sha256, nonce, output_sha256, evidence_sha256, " +
        "status, integrity, coverage_expected, coverage_evaluated, coverage_missing, " +
        "coverage_duplicates, coverage_unknown, reasons, receipt, verifier_version, created_at " +
        "FROM normative_receipts WHERE id = $1 LIMIT 1",
        [id]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404, headers: noStore });
      }
      return NextResponse.json(
        { receipt: result.rows[0], verifier: getCurrentVerifierInfo() },
        { headers: noStore }
      );
    }

    const result = await db.query(
      "SELECT id, cycle_id, attempt, protocol_version, si_version, si_git_blob_sha, manifest_sha256, " +
      "status, integrity, coverage_expected, coverage_evaluated, coverage_missing, coverage_duplicates, " +
      "coverage_unknown, reasons, verifier_version, created_at " +
      "FROM normative_receipts ORDER BY created_at DESC LIMIT 50"
    );

    const totals = result.rows.reduce(
      (acc: { total: number; verified: number; invalid: number; incomplete: number }, row: any) => {
        acc.total += 1;
        if (row.status === "VERIFIED") acc.verified += 1;
        if (row.status === "INVALID") acc.invalid += 1;
        if (row.status === "INCOMPLETE") acc.incomplete += 1;
        return acc;
      },
      { total: 0, verified: 0, invalid: 0, incomplete: 0 }
    );

    return NextResponse.json(
      { items: result.rows, totals, verifier: getCurrentVerifierInfo() },
      { headers: noStore }
    );
  } catch (error) {
    console.error("[NORM-CHECK] GET failed:", error);
    return NextResponse.json(
      { error: "Almacén de comprobaciones no disponible", reason_code: "NORM_CHECK_STORE_UNAVAILABLE" },
      { status: 503, headers: noStore }
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await authorize(request, true);
  if (!actor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: noStore });
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (declaredLength > 250000) {
      return NextResponse.json({ error: "Receipt demasiado grande" }, { status: 413, headers: noStore });
    }

    const raw = await request.text();
    if (raw.length > 250000) {
      return NextResponse.json({ error: "Receipt demasiado grande" }, { status: 413, headers: noStore });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "JSON inválido", reason_code: "RECEIPT_JSON_INVALID" }, { status: 400, headers: noStore });
    }

    const result = await verifyNormativeReceipt(body);
    if (!result.cycle_id || result.cycle_id === "UNKNOWN" || result.attempt < 1) {
      return NextResponse.json(
        { ok: false, stored: false, verifier: NORM_CHECK_VERIFIER_VERSION, result },
        { status: 422, headers: noStore }
      );
    }

    await ensureSchema();
    const db = getDb();
    const receipt = body as NormativeReceipt;

    try {
      const insert = await db.query(
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
          NORM_CHECK_VERIFIER_VERSION,
        ]
      );

      return NextResponse.json(
        { ok: result.status === "VERIFIED", stored: true, id: insert.rows[0].id, actor, result },
        { status: result.status === "VERIFIED" ? 200 : 422, headers: noStore }
      );
    } catch (error: any) {
      if (error?.code === "23505") {
        return NextResponse.json(
          { ok: false, stored: false, result, reason_code: "RECEIPT_ATTEMPT_ALREADY_EXISTS" },
          { status: 409, headers: noStore }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[NORM-CHECK] POST failed:", error);
    return NextResponse.json(
      { error: "Error interno de comprobación", reason_code: "NORM_CHECK_FAILED" },
      { status: 500, headers: noStore }
    );
  }
}
