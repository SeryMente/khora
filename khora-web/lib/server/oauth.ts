// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-2
import { getDb } from "./neon";
import { createHash, randomBytes } from "node:crypto";

export function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateRandomToken(bytesLength = 32): string {
  return randomBytes(bytesLength).toString("hex");
}

export interface AuthCodeRecord {
  id: number;
  code_hash: string;
  code_challenge: string;
  redirect_uri: string;
  resource: string;
  usuario: string;
  expira_en: Date;
  usado_en: Date | null;
}

export async function crearCodigoAutorizacion(params: {
  codeChallenge: string;
  redirectUri: string;
  resource: string;
  usuario: string;
}): Promise<string> {
  const rawCode = generateRandomToken(32);
  const codeHash = hashString(rawCode);
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 segundos TTL

  const db = getDb();
  await db.query(
    `INSERT INTO oauth_codes (code_hash, code_challenge, redirect_uri, resource, usuario, expira_en)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [codeHash, params.codeChallenge, params.redirectUri, params.resource, params.usuario, expiresAt]
  );

  return rawCode;
}

export async function obtenerCodigoAutorizacionValido(
  rawCode: string
): Promise<AuthCodeRecord | null> {
  const codeHash = hashString(rawCode);
  const db = getDb();

  const result = await db.query<AuthCodeRecord>(
    `SELECT id, code_hash, code_challenge, redirect_uri, resource, usuario, expira_en, usado_en
     FROM oauth_codes
     WHERE code_hash = $1
       AND usado_en IS NULL
       AND expira_en > NOW()`,
    [codeHash]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

export async function marcarCodigoComoUsado(id: number): Promise<boolean> {
  const db = getDb();
  const result = await db.query(
    `UPDATE oauth_codes
     SET usado_en = NOW()
     WHERE id = $1 AND usado_en IS NULL`,
    [id]
  );
  return result.rowCount === 1;
}

export async function consumirCodigoAutorizacion(
  rawCode: string
): Promise<AuthCodeRecord | null> {
  const record = await obtenerCodigoAutorizacionValido(rawCode);
  if (!record) return null;
  const marcado = await marcarCodigoComoUsado(record.id);
  if (!marcado) return null;
  return record;
}

export interface RefreshTokenRecord {
  id: number;
  token_hash: string;
  usuario: string;
  resource: string;
  emitido_en: Date;
  expira_en: Date;
  rotado_a: string | null;
}

export async function crearRefreshToken(params: {
  usuario: string;
  resource: string;
}): Promise<string> {
  const rawToken = generateRandomToken(32);
  const tokenHash = hashString(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  const db = getDb();
  await db.query(
    `INSERT INTO oauth_refresh_tokens (token_hash, usuario, resource, expira_en)
     VALUES ($1, $2, $3, $4)`,
    [tokenHash, params.usuario, params.resource, expiresAt]
  );

  return rawToken;
}

export async function rotarRefreshToken(
  rawToken: string
): Promise<{ record: RefreshTokenRecord; newToken: string } | null> {
  const tokenHash = hashString(rawToken);
  const db = getDb();

  const newRawToken = generateRandomToken(32);
  const newTokenHash = hashString(newRawToken);
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // UPDATE atómico condicional como única autoridad
    const updateRes = await client.query<RefreshTokenRecord>(
      `UPDATE oauth_refresh_tokens
       SET rotado_a = $1
       WHERE token_hash = $2
         AND rotado_a IS NULL
         AND expira_en > NOW()
       RETURNING id, token_hash, usuario, resource, emitido_en, expira_en, rotado_a`,
      [newTokenHash, tokenHash]
    );

    if (updateRes.rowCount !== 1) {
      await client.query("ROLLBACK");
      return null;
    }

    const record = updateRes.rows[0];

    await client.query(
      `INSERT INTO oauth_refresh_tokens (token_hash, usuario, resource, expira_en)
       VALUES ($1, $2, $3, $4)`,
      [newTokenHash, record.usuario, record.resource, newExpiresAt]
    );

    await client.query("COMMIT");
    return { record, newToken: newRawToken };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function obtenerGeneracionRevocacion(usuario: string): Promise<number> {
  const db = getDb();
  const res = await db.query<{ generacion: number }>(
    `SELECT generacion FROM mcp_revocacion WHERE usuario = $1`,
    [usuario]
  );

  if (res.rowCount === 0) {
    // Si no existe registro aún, la generación por defecto es 1
    return 1;
  }

  return res.rows[0].generacion;
}

export async function revocarAccesoUsuario(usuario: string): Promise<{ generacion: number }> {
  const db = getDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Incrementar o insertar generacion
    const res = await client.query<{ generacion: number }>(
      `INSERT INTO mcp_revocacion (usuario, generacion, actualizado_en)
       VALUES ($1, 2, NOW())
       ON CONFLICT (usuario)
       DO UPDATE SET generacion = mcp_revocacion.generacion + 1, actualizado_en = NOW()
       RETURNING generacion`,
      [usuario]
    );

    // Borrar todos sus refresh tokens
    await client.query(
      `DELETE FROM oauth_refresh_tokens WHERE usuario = $1`,
      [usuario]
    );

    await client.query("COMMIT");
    return { generacion: res.rows[0].generacion };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function obtenerInfoRevocacionUsuario(usuario: string): Promise<{ generacion: number; ultimoTokenAt: Date | null }> {
  const db = getDb();
  const genRes = await db.query<{ generacion: number }>(
    `SELECT generacion FROM mcp_revocacion WHERE usuario = $1`,
    [usuario]
  );

  const gen = genRes.rowCount && genRes.rows[0] ? genRes.rows[0].generacion : 1;

  const tokenRes = await db.query<{ emitido_en: Date }>(
    `SELECT emitido_en FROM oauth_refresh_tokens WHERE usuario = $1 ORDER BY emitido_en DESC LIMIT 1`,
    [usuario]
  );

  const ultimoTokenAt = tokenRes.rowCount && tokenRes.rows[0] ? tokenRes.rows[0].emitido_en : null;

  return { generacion: gen, ultimoTokenAt };
}
