import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/server/neon";
import { JwtPayload, signJwt, verifyJwt } from "@/lib/server/jwt";

export type EpState = "START" | "OK" | "FAIL" | "INFO" | "SKIP";
export interface EpTokenPayload extends JwtPayload { sid: string; typ: "ep-session"; }
export interface IncomingEpEvent {
  id: string; state: EpState; message?: string; durationMs?: number | null;
  timestamp?: string; detail?: Record<string, unknown> | null;
}
const EVENT_ID = /^EP-(IN|RUN|OUT)-[0-9]{3}$/;
const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9_]{12,}/g,
  /github_pat_[A-Za-z0-9_]{12,}/g,
  /vcp_[A-Za-z0-9]{8,}/g,
  /Bearer\s+[A-Za-z0-9._~-]{16,}/gi,
];
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function clean(value: unknown, limit = 4000): string {
  let text = String(value ?? "").slice(0, limit);
  for (const pattern of TOKEN_PATTERNS) text = text.replace(pattern, "[REDACTED]");
  return text;
}
function canonicalOrigin(origin?: string): string {
  const explicit = process.env.EP_CANONICAL_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") throw new Error("EP_CANONICAL_URL es obligatorio en produccion");
  return (origin || "http://localhost:3000") + "/api/ep";
}
export function getEpConfig(origin?: string) {
  const test = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST_RUN === "1";
  const secret = process.env.EP_BOOTSTRAP_JWT_SECRET || (test ? "test-ep-secret-must-have-at-least-32-characters" : undefined);
  if (!secret || secret.length < 32) throw new Error("EP_BOOTSTRAP_JWT_SECRET debe tener al menos 32 caracteres");
  const allowedEmail = (process.env.EP_ALLOWED_EMAIL || process.env.MCP_ALLOWED_EMAIL || "").toLowerCase();
  if (!allowedEmail && !test) throw new Error("EP_ALLOWED_EMAIL es obligatorio");
  const requested = Number(process.env.EP_TOKEN_TTL_SECONDS || "43200");
  const ttlSeconds = Math.max(900, Math.min(86400, Number.isFinite(requested) ? requested : 43200));
  return { secret, allowedEmail, audience: canonicalOrigin(origin), issuer: "khora-ep", ttlSeconds };
}
export function isEpUserAllowed(email: string, origin?: string): boolean {
  const allowed = getEpConfig(origin).allowedEmail;
  return !!email && (!allowed || email.toLowerCase() === allowed);
}
export async function createEpSessionToken(email: string, origin: string) {
  const config = getEpConfig(origin);
  if (!isEpUserAllowed(email, origin)) throw new Error("Usuario no autorizado para Entorno Persistente");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + config.ttlSeconds;
  const sid = randomUUID();
  const jti = randomBytes(24).toString("base64url");
  const payload: EpTokenPayload = {
    iss: config.issuer, sub: email.toLowerCase(), aud: config.audience,
    scope: "ep:bootstrap ep:logs:write ep:logs:read", gen: 1,
    exp, iat: now, jti, sid, typ: "ep-session",
  };
  const token = signJwt(payload, config.secret);
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE ep_bootstrap_tokens SET revocado_en=NOW()
       WHERE usuario=$1 AND revocado_en IS NULL AND expira_en>NOW()`, [payload.sub]
    );
    await client.query(
      `UPDATE ep_sessions SET estado='superseded', cerrado_en=COALESCE(cerrado_en,NOW())
       WHERE usuario=$1 AND cerrado_en IS NULL`, [payload.sub]
    );
    await client.query(`INSERT INTO ep_sessions(id,usuario) VALUES($1,$2)`, [sid,payload.sub]);
    await client.query(
      `INSERT INTO ep_bootstrap_tokens(jti_hash,session_id,usuario,expira_en)
       VALUES($1,$2,$3,to_timestamp($4))`, [sha256(jti),sid,payload.sub,exp]
    );
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  return { token, payload, expiresAt: new Date(exp * 1000).toISOString() };
}
export async function authenticateEpBearer(req: Request, scopes: string[]): Promise<EpTokenPayload> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("missing_bearer");
  const raw = header.slice(7).trim();
  const origin = new URL(req.url).origin;
  const config = getEpConfig(origin);
  const payload = verifyJwt(raw, config.secret) as EpTokenPayload | null;
  if (!payload || payload.typ !== "ep-session" || payload.iss !== config.issuer || payload.aud !== config.audience || !payload.sid) throw new Error("invalid_token");
  const granted = new Set((payload.scope || "").split(/\s+/).filter(Boolean));
  if (scopes.some(scope => !granted.has(scope))) throw new Error("insufficient_scope");
  const result = await getDb().query(
    `SELECT 1 FROM ep_bootstrap_tokens
     WHERE jti_hash=$1 AND session_id=$2 AND usuario=$3
       AND revocado_en IS NULL AND expira_en>NOW()`,
    [sha256(payload.jti),payload.sid,payload.sub]
  );
  if (!result.rowCount) throw new Error("revoked_or_expired");
  return payload;
}
export async function markBootstrapFetched(payload: EpTokenPayload) {
  await getDb().query(
    `UPDATE ep_bootstrap_tokens SET consumido_en=COALESCE(consumido_en,NOW()) WHERE jti_hash=$1 AND session_id=$2`,
    [sha256(payload.jti),payload.sid]
  );
  await getDb().query(
    `UPDATE ep_sessions SET bootstrap_recogido_en=COALESCE(bootstrap_recogido_en,NOW()), estado='bootstrapping' WHERE id=$1 AND usuario=$2`,
    [payload.sid,payload.sub]
  );
}
function normalizeEvent(event: IncomingEpEvent) {
  if (!EVENT_ID.test(event.id)) throw new Error(`event_id invalido: ${event.id}`);
  if (!["START","OK","FAIL","INFO","SKIP"].includes(event.state)) throw new Error("estado invalido");
  const duration = event.durationMs == null ? null : Math.max(0, Math.min(Number(event.durationMs), 86400000));
  let detail: Record<string, unknown> | null = null;
  if (event.detail) {
    const serialized = clean(JSON.stringify(event.detail), 16000);
    try { detail = JSON.parse(serialized); } catch { detail = { redacted: true }; }
  }
  return { id:event.id,state:event.state,message:clean(event.message),durationMs:duration,timestamp:event.timestamp || null,detail };
}
export async function appendEpEvents(payload: EpTokenPayload, incoming: IncomingEpEvent[]) {
  if (!Array.isArray(incoming) || incoming.length < 1 || incoming.length > 100) throw new Error("lote de eventos invalido");
  const events = incoming.map(normalizeEvent);
  const client = await getDb().connect();
  const inserted: Array<{sequence:number;hash:string}> = [];
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT siguiente_secuencia,ultimo_hash FROM ep_sessions WHERE id=$1 AND usuario=$2 FOR UPDATE`,
      [payload.sid,payload.sub]
    );
    if (!locked.rowCount) throw new Error("session_not_found");
    let sequence = Number(locked.rows[0].siguiente_secuencia);
    let previous = String(locked.rows[0].ultimo_hash);
    for (const event of events) {
      const canonical = JSON.stringify({sid:payload.sid,sequence,id:event.id,state:event.state,message:event.message,durationMs:event.durationMs,timestamp:event.timestamp,detail:event.detail});
      const hash = sha256(previous + canonical);
      await client.query(
        `INSERT INTO ep_events(session_id,secuencia,event_id,estado,mensaje,duracion_ms,cliente_en,detalle,hash_anterior,event_hash)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [payload.sid,sequence,event.id,event.state,event.message,event.durationMs,event.timestamp,event.detail,previous,hash]
      );
      inserted.push({sequence,hash});previous=hash;sequence++;
    }
    const closes = events.some(event => event.id === "EP-OUT-100" && event.state === "OK");
    await client.query(
      `UPDATE ep_sessions SET siguiente_secuencia=$2,ultimo_hash=$3,ultimo_evento_en=NOW(),
       estado=CASE WHEN $4 THEN 'closed' ELSE 'active' END,
       cerrado_en=CASE WHEN $4 THEN NOW() ELSE cerrado_en END WHERE id=$1`,
      [payload.sid,sequence,previous,closes]
    );
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  return inserted;
}
export async function readEpEvents(payload: EpTokenPayload, which: "current" | "last", limit = 5000) {
  let sessionId = payload.sid;
  if (which === "last") {
    const previous = await getDb().query(
      `SELECT id FROM ep_sessions WHERE usuario=$1 AND id<>$2 ORDER BY creado_en DESC LIMIT 1`,
      [payload.sub,payload.sid]
    );
    if (!previous.rowCount) return {session:null,events:[]};
    sessionId = String(previous.rows[0].id);
  }
  const session = await getDb().query(
    `SELECT id,usuario,estado,creado_en,bootstrap_recogido_en,ultimo_evento_en,cerrado_en,ultimo_hash FROM ep_sessions WHERE id=$1 AND usuario=$2`,
    [sessionId,payload.sub]
  );
  const events = await getDb().query(
    `SELECT secuencia,event_id,estado,mensaje,duracion_ms,cliente_en,servidor_en,detalle,hash_anterior,event_hash
     FROM ep_events WHERE session_id=$1 ORDER BY secuencia ASC LIMIT $2`, [sessionId,Math.max(1,Math.min(limit,10000))]
  );
  return {session:session.rows[0] || null,events:events.rows};
}
export async function getEpSessionSummary(email: string) {
  const result = await getDb().query(
    `SELECT id,estado,creado_en,ultimo_evento_en,cerrado_en FROM ep_sessions WHERE usuario=$1 ORDER BY creado_en DESC LIMIT 2`,
    [email.toLowerCase()]
  );
  return result.rows;
}
