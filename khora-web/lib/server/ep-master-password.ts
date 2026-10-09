import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getEpConfig } from "@/lib/server/ep";
import { getDb } from "@/lib/server/neon";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type EpMasterPasswordResult = "accepted" | "rejected" | "rate_limited" | "unavailable";

function secretPepper(password: string): string {
  const { secret } = getEpConfig();
  return createHmac("sha256", secret).update("khora-ep-master-password-v1\0").update(password, "utf8").digest("hex");
}

function sourceFingerprint(request: Request): string {
  const { secret } = getEpConfig();
  const address = (request.headers.get("x-real-ip") || request.headers.get("x-vercel-forwarded-for") || "unknown").trim().slice(0, 200);
  return createHmac("sha256", secret).update("khora-ep-master-rate-v1\0").update(address, "utf8").digest("hex");
}

function calculate(password: string, salt: Buffer): Buffer {
  return scryptSync(secretPepper(password), salt, 64, SCRYPT_OPTIONS);
}

export async function getEpMasterPasswordStatus(): Promise<{ configured: boolean; updatedAt: string | null }> {
  try {
    const result = await getDb().query("SELECT updated_at FROM ep_master_password WHERE singleton_id=1");
    if (!result.rowCount) return { configured: false, updatedAt: null };
    const updated = result.rows[0].updated_at;
    return { configured: true, updatedAt: updated instanceof Date ? updated.toISOString() : String(updated || "") };
  } catch {
    throw new Error("ep_master_password_unavailable");
  }
}

export async function setEpMasterPassword(password: string, updatedBy: string): Promise<void> {
  if (password.length < 16 || password.length > 1024) throw new Error("ep_master_password_policy");
  const email = updatedBy.trim().toLowerCase();
  if (!email || email.length > 320) throw new Error("ep_master_password_policy");
  const salt = randomBytes(32);
  const verifier = calculate(password, salt);
  try {
    await getDb().query(
      `INSERT INTO ep_master_password(singleton_id,salt_hex,verifier_hex,updated_by,updated_at)
       VALUES(1,$1,$2,$3,NOW())
       ON CONFLICT(singleton_id) DO UPDATE SET salt_hex=EXCLUDED.salt_hex,verifier_hex=EXCLUDED.verifier_hex,
       updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
      [salt.toString("hex"), verifier.toString("hex"), email],
    );
    await getDb().query("DELETE FROM ep_master_auth_attempts");
  } catch {
    throw new Error("ep_master_password_unavailable");
  } finally {
    salt.fill(0);
    verifier.fill(0);
  }
}

export async function authenticateEpMasterPassword(password: string, request: Request): Promise<EpMasterPasswordResult> {
  if (!password || password.length > 1024) return "rejected";
  let sourceHash: string;
  try { sourceHash = sourceFingerprint(request); } catch { return "unavailable"; }
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["ep-master:" + sourceHash]);
    await client.query("DELETE FROM ep_master_auth_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'");
    const attempts = await client.query(
      "SELECT COUNT(*)::int AS failures FROM ep_master_auth_attempts WHERE source_hash=$1 AND succeeded=false AND attempted_at > NOW() - ($2::int * INTERVAL '1 minute')",
      [sourceHash, WINDOW_MINUTES],
    );
    if (Number(attempts.rows[0]?.failures || 0) >= MAX_ATTEMPTS) {
      await client.query("ROLLBACK");
      return "rate_limited";
    }
    const stored = await client.query("SELECT salt_hex,verifier_hex FROM ep_master_password WHERE singleton_id=1");
    if (!stored.rowCount) {
      await client.query("ROLLBACK");
      return "unavailable";
    }
    const salt = Buffer.from(String(stored.rows[0].salt_hex), "hex");
    const expected = Buffer.from(String(stored.rows[0].verifier_hex), "hex");
    let actual: Buffer | null = null;
    let accepted = false;
    try {
      if (salt.length === 32 && expected.length === 64) {
        actual = calculate(password, salt);
        accepted = timingSafeEqual(actual, expected);
      }
    } finally { salt.fill(0); actual?.fill(0); }
    if (accepted) {
      await client.query("DELETE FROM ep_master_auth_attempts WHERE source_hash=$1", [sourceHash]);
    }
    await client.query("INSERT INTO ep_master_auth_attempts(source_hash,succeeded) VALUES($1,$2)", [sourceHash, accepted]);
    await client.query("COMMIT");
    return accepted ? "accepted" : "rejected";
  } catch {
    try { await client.query("ROLLBACK"); } catch {}
    return "unavailable";
  } finally { client.release(); }
}
