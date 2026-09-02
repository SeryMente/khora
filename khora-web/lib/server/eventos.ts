// @l0 L0-002-R · @req SISTEMA-MENU/E3,E4,H
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";

export type FaseEvento =
  | "dictado"
  | "transcripcion"
  | "revision"
  | "manejo"
  | "autorizacion"
  | "ingesta"
  | "grafo";

export type EstadoEvento = "START" | "OK" | "FAIL" | "INFO" | "SKIP";

export interface RegistrarEventoParams {
  fase: FaseEvento;
  eventId: string;
  estado: EstadoEvento;
  mensaje: string;
  detalle?: Record<string, unknown> | null;
  volcadoId?: string | null;
  version?: number | null;
  sha256?: string | null;
  correlacionId?: string | null;
  clienteEn?: string | null;
}

export interface EventoSistema {
  id: number;
  fase: FaseEvento;
  event_id: string;
  estado: EstadoEvento;
  mensaje: string;
  detalle: Record<string, unknown> | null;
  volcado_id: string | null;
  version: number | null;
  sha256: string | null;
  correlacion_id: string | null;
  servidor_en: string;
  cliente_en: string | null;
  hash_anterior: string | null;
  event_hash: string | null;
}

const FASES_VALIDAS = new Set<FaseEvento>([
  "dictado",
  "transcripcion",
  "revision",
  "manejo",
  "autorizacion",
  "ingesta",
  "grafo",
]);

const PREFIJOS_FASE: Record<FaseEvento, string> = {
  dictado: "DIC",
  transcripcion: "TRS",
  revision: "REV",
  manejo: "MAN",
  autorizacion: "AUT",
  ingesta: "ING",
  grafo: "GRA",
};

export const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9_]{12,}/g,
  /github_pat_[A-Za-z0-9_]{12,}/g,
  /vcp_[A-Za-z0-9]{8,}/g,
  /Bearer\s+[A-Za-z0-9._~-]{16,}/gi,
  /gsk_[A-Za-z0-9_]{16,}/g,
  /ntn_[A-Za-z0-9_]{16,}/g,
  /secret_[A-Za-z0-9_]{16,}/g,
];

export function cleanSecretos(value: unknown, limit = 16000): string {
  let text = String(value ?? "").slice(0, limit);
  for (const pattern of TOKEN_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text;
}

export function validarEventId(fase: FaseEvento, eventId: string): boolean {
  if (!FASES_VALIDAS.has(fase)) return false;
  const prefijoEsperado = PREFIJOS_FASE[fase];
  const regex = new RegExp(`^${prefijoEsperado}-[0-9]{3}$`);
  return regex.test(eventId);
}

const DDL_EVENTOS_SISTEMA = [
  `CREATE TABLE IF NOT EXISTS eventos_sistema (
    id BIGSERIAL PRIMARY KEY,
    fase TEXT NOT NULL CHECK (fase IN ('dictado','transcripcion','revision','manejo','autorizacion','ingesta','grafo')),
    event_id TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('START','OK','FAIL','INFO','SKIP')),
    mensaje TEXT NOT NULL,
    detalle JSONB,
    volcado_id UUID,
    version INTEGER,
    sha256 TEXT,
    correlacion_id UUID,
    servidor_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente_en TIMESTAMPTZ,
    hash_anterior TEXT,
    event_hash TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_fase_idx ON eventos_sistema(fase);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_correlacion_idx ON eventos_sistema(correlacion_id);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_volcado_idx ON eventos_sistema(volcado_id);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_servidor_idx ON eventos_sistema(servidor_en DESC);`,
];

let tablaEventosLista = false;

export async function asegurarTablaEventosSistema(): Promise<void> {
  if (tablaEventosLista) return;
  const db = getDb();
  for (const sql of DDL_EVENTOS_SISTEMA) {
    await db.query(sql);
  }
  tablaEventosLista = true;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function executeWithTimeout<T>(promise: Promise<T>, ms: number, defaultValue: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(defaultValue), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => defaultValue);
}

async function doRegistrarEvento(params: RegistrarEventoParams): Promise<boolean> {
  await asegurarTablaEventosSistema();

  if (!FASES_VALIDAS.has(params.fase)) {
    console.warn(`[registrarEvento] Fase inválida: ${params.fase}`);
    return false;
  }

  if (!validarEventId(params.fase, params.eventId)) {
    console.warn(`[registrarEvento] event_id inválido para fase ${params.fase}: ${params.eventId}`);
    return false;
  }

  const db = getDb();
  const mensajeLimpio = cleanSecretos(params.mensaje, 4000);

  let detalleJson: Record<string, unknown> | null = null;
  if (params.detalle) {
    try {
      const sanitized = cleanSecretos(JSON.stringify(params.detalle), 16000);
      detalleJson = JSON.parse(sanitized);
    } catch {
      detalleJson = { redacted: true };
    }
  }

  const correlacionId = params.correlacionId ? params.correlacionId : randomUUID();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Cadena de integridad HASH POR CORRELACION_ID
    const lastRes = await client.query(
      `SELECT event_hash FROM eventos_sistema
       WHERE correlacion_id = $1
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [correlacionId]
    );

    const hashAnterior = lastRes.rows.length > 0 && lastRes.rows[0].event_hash
      ? String(lastRes.rows[0].event_hash)
      : "0".repeat(64);

    const canonical = JSON.stringify({
      correlacion_id: correlacionId,
      fase: params.fase,
      event_id: params.eventId,
      estado: params.estado,
      mensaje: mensajeLimpio,
      volcado_id: params.volcadoId ?? null,
      version: params.version ?? null,
      sha256: params.sha256 ?? null,
      detalle: detalleJson,
    });

    const eventHash = sha256Hex(hashAnterior + canonical);

    await client.query(
      `INSERT INTO eventos_sistema (
        fase, event_id, estado, mensaje, detalle,
        volcado_id, version, sha256, correlacion_id, cliente_en,
        hash_anterior, event_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        params.fase,
        params.eventId,
        params.estado,
        mensajeLimpio,
        detalleJson ? JSON.stringify(detalleJson) : null,
        params.volcadoId ?? null,
        params.version ?? null,
        params.sha256 ?? null,
        correlacionId,
        params.clienteEn ?? null,
        hashAnterior,
        eventHash,
      ]
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[registrarEvento] Error escribiendo evento:", err);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Función publica para registrar un evento del sistema de forma NO-BLOQUEANTE.
 * Garantiza que nunca lanza ni bloquea la operación llamante.
 */
export async function registrarEvento(params: RegistrarEventoParams): Promise<boolean> {
  return executeWithTimeout(doRegistrarEvento(params), 3000, false);
}
