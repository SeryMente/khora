import { createHmac } from "node:crypto";
import { getDb } from "./neon";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { recordSchema, type ExperienceRecord } from "../contracts/dictado-experience";

export const RETENTION_DAYS = 90;
export function experienceOwner(user: { id?: string; email?: string | null } | undefined | null, secret = process.env.AUTH_SECRET): string | null {
  const subject = user?.id ? "id:" + user.id : user?.email ? "email:" + user.email.toLowerCase() : null;
  if (!subject || !secret) return null;
  return createHmac("sha256", secret).update("khora-experience/v1:" + subject).digest("hex");
}
// Additive, idempotent migration of this feature only. No existing events/schema altered.
export const EXPERIENCE_DDL = `CREATE TABLE IF NOT EXISTS khora_function_experience (
 owner_key text NOT NULL, record_id uuid NOT NULL, session_id uuid NOT NULL,
 release_sha text, server_release_sha text, payload jsonb NOT NULL,
 comment_encrypted text, content_mac text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_key, record_id)
); CREATE INDEX IF NOT EXISTS khora_function_experience_owner_time ON khora_function_experience(owner_key, created_at);`;
let schemaReady: Promise<unknown> | undefined;
async function ready() {
  if (!schemaReady) schemaReady = getDb().query(EXPERIENCE_DDL).catch(e => { schemaReady = undefined; throw e; });
  await schemaReady;
}
export async function saveExperience(owner: string, input: ExperienceRecord): Promise<"saved" | "duplicate" | "conflict" | "limited"> {
  const record = recordSchema.parse(input);
  // Encrypt before DDL/INSERT. Missing key fails closed; no plaintext fallback.
  const comment = record.data.kind === "feedback" ? record.data.comment : "";
  const encrypted = comment ? cifrarTexto(comment) : null;
  const clean = { ...record, data: record.data.kind === "feedback" ? { ...record.data, comment: "" } : record.data };
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("experience_secret_unavailable");
  const mac = createHmac("sha256", secret).update(JSON.stringify(record)).digest("hex");
  await ready();
  const db = getDb();
  // Owner-bound idempotency check precedes rate limit, allowing acknowledged retries.
  const existing = await db.query("SELECT content_mac FROM khora_function_experience WHERE owner_key=$1 AND record_id=$2", [owner, record.id]);
  if (existing.rows.length) return existing.rows[0].content_mac === mac ? "duplicate" : "conflict";
  const limit = await db.query("SELECT count(*)::int AS n FROM khora_function_experience WHERE owner_key=$1 AND created_at > now()-interval '1 day'", [owner]);
  if (limit.rows[0].n >= 500) return "limited";
  const inserted = await db.query(`INSERT INTO khora_function_experience(owner_key,record_id,session_id,release_sha,server_release_sha,payload,comment_encrypted,content_mac)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT(owner_key,record_id) DO NOTHING RETURNING record_id`,
    [owner, record.id, record.sessionId, record.clientRelease, process.env.KHORA_RELEASE_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null, JSON.stringify(clean), encrypted, mac]);
  if (!inserted.rows.length) {
    const other = await db.query("SELECT content_mac FROM khora_function_experience WHERE owner_key=$1 AND record_id=$2", [owner, record.id]);
    return other.rows[0]?.content_mac === mac ? "duplicate" : "conflict";
  }
  return "saved";
}
export async function readExperience(owner: string) {
  await ready();
  const db = getDb();
  // Physical expiry applies to this owner's feature records when accessed; never to audit logs.
  await db.query("DELETE FROM khora_function_experience WHERE owner_key=$1 AND created_at < now()-interval '90 days'", [owner]);
  const res = await db.query("SELECT payload,comment_encrypted,created_at FROM khora_function_experience WHERE owner_key=$1 AND created_at >= now()-interval '90 days' ORDER BY created_at DESC LIMIT 5001", [owner]);
  const records = res.rows.slice(0, 5000).map(row => {
    const payload = structuredClone(row.payload);
    if (payload.data?.kind === "feedback" && row.comment_encrypted) payload.data.comment = descifrarTexto(row.comment_encrypted);
    const record = recordSchema.parse(payload);
    return { ...record, savedAt: new Date(row.created_at).toISOString() };
  });
  return { records, truncated: res.rows.length > 5000 };
}
export async function deleteExperience(owner: string) {
  await ready(); return getDb().query("DELETE FROM khora_function_experience WHERE owner_key=$1", [owner]);
}
