// @l0 L0-002-R · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/server/neon";

export const VAULT_AGENT_SCOPE = "canonical-vault";
export const VAULT_AGENT_MINUTES = 60;
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type VaultAgentRow = {
  token_hash: string;
  usuario: string;
  expira_en: string;
  emitido_en: string;
  revocado_en: string | null;
  scope: string;
  audience: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalRoot(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("VAULT_AGENT_CANONICAL_URL invalido");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("VAULT_AGENT_CANONICAL_URL no admite credenciales, query ni fragmento");
  if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "test" && parsed.protocol === "http:")) throw new Error("VAULT_AGENT_CANONICAL_URL debe usar HTTPS");
  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (pathname) throw new Error("VAULT_AGENT_CANONICAL_URL debe ser el origen de Khora Web");
  return parsed.origin;
}

function config(origin?: string) {
  const test = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST_RUN === "1";
  const configuredUrl = process.env.VAULT_AGENT_CANONICAL_URL?.trim();
  if (!configuredUrl && !test) throw new Error("VAULT_AGENT_CANONICAL_URL es obligatorio en produccion");
  const audience = canonicalRoot(configuredUrl || origin || "http://localhost:3000");
  const allowedEmail = (process.env.VAULT_AGENT_ALLOWED_EMAIL || process.env.EP_ALLOWED_EMAIL || "").trim().toLowerCase();
  if (!allowedEmail && !test) throw new Error("VAULT_AGENT_ALLOWED_EMAIL o EP_ALLOWED_EMAIL es obligatorio");
  return { audience, allowedEmail };
}

function assertAllowed(email: string, origin?: string): void {
  const configured = config(origin).allowedEmail;
  if (!email || (configured && email.toLowerCase() !== configured)) throw new Error("not_authorized");
}

export async function ensureVaultAgentTokens(): Promise<void> {
  await getDb().query(
    `CREATE TABLE IF NOT EXISTS vault_agent_tokens (
      token_hash TEXT PRIMARY KEY,
      usuario TEXT NOT NULL,
      expira_en TIMESTAMPTZ NOT NULL,
      emitido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revocado_en TIMESTAMPTZ NULL,
      scope TEXT NOT NULL,
      audience TEXT NOT NULL
    )`
  );
  await getDb().query("CREATE INDEX IF NOT EXISTS vault_agent_tokens_user_idx ON vault_agent_tokens(usuario, emitido_en DESC)");
}

export async function issueVaultAgentToken(email: string, origin?: string) {
  await ensureVaultAgentTokens();
  const normalizedEmail = email.toLowerCase();
  const { audience } = config(origin);
  assertAllowed(normalizedEmail, origin);

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [normalizedEmail]);

    const rate = await client.query(
      `SELECT COUNT(*)::int AS cnt
       FROM vault_agent_tokens
       WHERE usuario=$1 AND emitido_en > NOW() - INTERVAL '15 minutes'`,
      [normalizedEmail]
    );
    if ((rate.rows[0]?.cnt ?? 0) >= 5) throw new Error("rate_limit_exceeded");

    await client.query(
      `UPDATE vault_agent_tokens
       SET revocado_en=NOW()
       WHERE usuario=$1 AND revocado_en IS NULL AND expira_en>NOW()`,
      [normalizedEmail]
    );

    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + VAULT_AGENT_MINUTES * 60_000);
    await client.query(
      `INSERT INTO vault_agent_tokens(token_hash,usuario,expira_en,scope,audience)
       VALUES($1,$2,$3,$4,$5)`,
      [tokenHash, normalizedEmail, expiresAt.toISOString(), VAULT_AGENT_SCOPE, audience]
    );
    await client.query("COMMIT");

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      audience,
      scope: VAULT_AGENT_SCOPE,
      minutes: VAULT_AGENT_MINUTES,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticateVaultAgentToken(req: Request): Promise<VaultAgentRow> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer[ \t]+([A-Za-z0-9_-]+)$/i);
  if (!match || !TOKEN_PATTERN.test(match[1])) throw new Error("invalid_token");

  await ensureVaultAgentTokens();
  const tokenHash = sha256(match[1]);
  const result = await getDb().query(
    `SELECT token_hash,usuario,expira_en,emitido_en,revocado_en,scope,audience
     FROM vault_agent_tokens
     WHERE token_hash=$1 AND revocado_en IS NULL AND expira_en>NOW()
     LIMIT 1`,
    [tokenHash]
  );
  if (!result.rowCount) throw new Error("revoked_or_expired");

  const row = result.rows[0] as VaultAgentRow;
  const requestOrigin = new URL(req.url).origin;
  const expectedAudience = config(requestOrigin).audience;
  if (row.audience !== expectedAudience || row.scope !== VAULT_AGENT_SCOPE) throw new Error("invalid_capability");

  return row;
}

export async function revokeVaultAgentTokenForUser(email: string, origin?: string): Promise<number> {
  await ensureVaultAgentTokens();
  const normalizedEmail = email.toLowerCase();
  assertAllowed(normalizedEmail, origin);
  const result = await getDb().query(
    `UPDATE vault_agent_tokens
     SET revocado_en=NOW()
     WHERE usuario=$1 AND revocado_en IS NULL AND expira_en>NOW()`,
    [normalizedEmail]
  );
  return result.rowCount ?? 0;
}

export async function getVaultAgentStatus(email: string, origin?: string) {
  await ensureVaultAgentTokens();
  const normalizedEmail = email.toLowerCase();
  assertAllowed(normalizedEmail, origin);
  const result = await getDb().query(
    `SELECT emitido_en, expira_en, scope, audience
     FROM vault_agent_tokens
     WHERE usuario=$1 AND revocado_en IS NULL AND expira_en>NOW()
     ORDER BY emitido_en DESC LIMIT 1`,
    [normalizedEmail]
  );
  if (!result.rowCount) return { active: false };
  return {
    active: true,
    issuedAt: new Date(String(result.rows[0].emitido_en)).toISOString(),
    expiresAt: new Date(String(result.rows[0].expira_en)).toISOString(),
    scope: String(result.rows[0].scope),
    audience: String(result.rows[0].audience),
  };
}

export function makeVaultAgentSessionId(): string {
  return randomUUID();
}
