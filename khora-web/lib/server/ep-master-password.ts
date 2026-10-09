import "server-only";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/server/neon";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_WINDOW = 8;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type EpMasterAuthResult = "accepted" | "rejected" | "rate_limited" | "unavailable";

function fingerprint(request: Request): string {
  // x-real-ip is set by the trusted hosting edge. Do not persist the raw address.
  const address = (request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 200);
  return createHash("sha256").update("khora-ep-master-rate-v1\0" + address).digest("hex");
}

function verifyConfiguredPassword(candidate: string): boolean {
  const saltHex = process.env.EP_MASTER_PASSWORD_SALT || "";
  const hashHex = process.env.EP_MASTER_PASSWORD_HASH || "";
  if (!/^[0-9a-f]{32,128}$/i.test(saltHex) || saltHex.length % 2 !== 0 || !/^[0-9a-f]{128}$/i.test(hashHex)) {
    throw new Error("EP_MASTER_PASSWORD_VERIFIER_MISSING");
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(candidate, salt, expected.length, SCRYPT_OPTIONS);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function authenticateEpMasterPassword(candidate: string, request: Request): Promise<EpMasterAuthResult> {
  if (!candidate || candidate.length > 1024) return "rejected";
  const db = getDb();
  const sourceHash = fingerprint(request);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["ep-master-auth:" + sourceHash]);
    await client.query("DELETE FROM ep_master_auth_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'");
    const recent = await client.query(
      "SELECT COUNT(*)::int AS failures FROM ep_master_auth_attempts WHERE source_hash=$1 AND succeeded=false AND attempted_at > NOW() - ($2::int * INTERVAL '1 minute')",
      [sourceHash, WINDOW_MINUTES],
    );
    if (Number(recent.rows[0]?.failures || 0) >= MAX_FAILURES_PER_WINDOW) {
      await client.query("ROLLBACK");
      return "rate_limited";
    }

    const accepted = verifyConfiguredPassword(candidate);
    if (accepted) {
      await client.query("DELETE FROM ep_master_auth_attempts WHERE source_hash=$1", [sourceHash]);
    }
    await client.query(
      "INSERT INTO ep_master_auth_attempts(source_hash, succeeded) VALUES($1,$2)",
      [sourceHash, accepted],
    );
    await client.query("COMMIT");
    return accepted ? "accepted" : "rejected";
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}
