import { generateRandomToken, hashString, obtenerGeneracionRevocacion } from "./oauth";
import { getDb } from "./neon";
import { getMcpConfig } from "./mcp-config";

export const MANUAL_MCP_TOKEN_PREFIX = "khora_mcp_v1_";
export const MANUAL_MCP_SCOPES = ["runtime:read", "volcados:read", "norm:turn"] as const;
export const MANUAL_MCP_DEFAULT_EXPIRY_DAYS = 90;

type ManualScope = (typeof MANUAL_MCP_SCOPES)[number];

export interface ManualMcpTokenRecord {
  id: string;
  token_prefix: string;
  usuario: string;
  resource: string;
  scope: string;
  generacion: number;
  etiqueta: string;
  emitido_en: Date;
  expira_en: Date;
  ultimo_uso_en: Date | null;
  revocado_en: Date | null;
}

function normalizeScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) return [];
  const requested = scopes.map((scope) => String(scope).trim()).filter(Boolean);
  const unique = new Set(requested);
  if (unique.size !== requested.length) throw new Error("MANUAL_TOKEN_SCOPE_INVALID");
  if (requested.some((scope) => !MANUAL_MCP_SCOPES.includes(scope as ManualScope))) {
    throw new Error("MANUAL_TOKEN_SCOPE_INVALID");
  }
  return MANUAL_MCP_SCOPES.filter((scope) => unique.has(scope));
}

function normalizeLabel(value: unknown): string {
  if (typeof value !== "string") return "MCP manual";
  const label = value.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  return label.slice(0, 80) || "MCP manual";
}

function normalizeExpiryDays(value: unknown): number {
  if (value === undefined || value === null || value === "") return MANUAL_MCP_DEFAULT_EXPIRY_DAYS;
  const days = Number(value);
  if (!Number.isInteger(days) || ![30, 90, 365].includes(days)) {
    throw new Error("MANUAL_TOKEN_EXPIRY_INVALID");
  }
  return days;
}

function validActor(actor: unknown): actor is string {
  return typeof actor === "string" && actor.trim().length > 0 && actor.trim().length <= 320;
}

export async function createManualMcpToken(params: {
  usuario: string;
  scopes: unknown;
  expiresInDays?: unknown;
  label?: unknown;
}) {
  if (!validActor(params.usuario)) throw new Error("MANUAL_TOKEN_ACTOR_INVALID");

  const scopes = normalizeScopes(params.scopes);
  if (scopes.length === 0) throw new Error("MANUAL_TOKEN_SCOPE_REQUIRED");

  const expiresInDays = normalizeExpiryDays(params.expiresInDays);
  const config = getMcpConfig();
  if (!config) throw new Error("MCP_CONFIG_MISSING");

  const rawToken = MANUAL_MCP_TOKEN_PREFIX + generateRandomToken(32);
  const tokenHash = hashString(rawToken);
  const tokenPrefix = rawToken.slice(0, MANUAL_MCP_TOKEN_PREFIX.length + 8);
  const etiqueta = normalizeLabel(params.label);
  const generacion = await obtenerGeneracionRevocacion(params.usuario);
  const expiraEn = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const db = getDb();
  const result = await db.query<ManualMcpTokenRecord>(
    "INSERT INTO mcp_manual_tokens " +
      "(token_hash, token_prefix, usuario, resource, scope, generacion, etiqueta, expira_en) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8) " +
      "RETURNING id::text AS id, token_prefix, usuario, resource, scope, generacion, etiqueta, emitido_en, expira_en, ultimo_uso_en, revocado_en",
    [tokenHash, tokenPrefix, params.usuario, config.canonicalUrl, scopes.join(" "), generacion, etiqueta, expiraEn]
  );

  return {
    token: rawToken,
    bearer: "Bearer " + rawToken,
    record: result.rows[0],
  };
}

export async function authenticateManualMcpToken(rawToken: string): Promise<ManualMcpTokenRecord | null> {
  if (typeof rawToken !== "string" || !rawToken.startsWith(MANUAL_MCP_TOKEN_PREFIX)) return null;

  const db = getDb();
  const tokenHash = hashString(rawToken);
  const result = await db.query<ManualMcpTokenRecord>(
    "SELECT id::text AS id, token_prefix, usuario, resource, scope, generacion, etiqueta, emitido_en, expira_en, ultimo_uso_en, revocado_en " +
      "FROM mcp_manual_tokens " +
      "WHERE token_hash = $1 AND revocado_en IS NULL AND expira_en > NOW() " +
      "LIMIT 1",
    [tokenHash]
  );

  const record = result.rows[0] || null;
  if (!record) return null;

  await db.query(
    "UPDATE mcp_manual_tokens SET ultimo_uso_en = NOW() WHERE id = $1::uuid AND revocado_en IS NULL",
    [record.id]
  );

  return record;
}

export async function listManualMcpTokens(usuario: string): Promise<ManualMcpTokenRecord[]> {
  if (!validActor(usuario)) throw new Error("MANUAL_TOKEN_ACTOR_INVALID");
  const generacion = await obtenerGeneracionRevocacion(usuario);
  const db = getDb();
  const result = await db.query<ManualMcpTokenRecord>(
    "SELECT id::text AS id, token_prefix, usuario, resource, scope, generacion, etiqueta, emitido_en, expira_en, ultimo_uso_en, revocado_en " +
      "FROM mcp_manual_tokens " +
      "WHERE usuario = $1 AND revocado_en IS NULL AND expira_en > NOW() AND generacion = $2 " +
      "ORDER BY emitido_en DESC",
    [usuario, generacion]
  );
  return result.rows;
}

export async function revokeManualMcpToken(usuario: string, id: string): Promise<boolean> {
  if (!validActor(usuario)) throw new Error("MANUAL_TOKEN_ACTOR_INVALID");
  if (typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) throw new Error("MANUAL_TOKEN_ID_INVALID");

  const db = getDb();
  const result = await db.query(
    "UPDATE mcp_manual_tokens SET revocado_en = NOW() WHERE id = $1::uuid AND usuario = $2 AND revocado_en IS NULL",
    [id, usuario]
  );
  return result.rowCount === 1;
}
