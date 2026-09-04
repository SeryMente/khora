// @l0 L0-002-R · @req SISTEMA-MENU/E3,E4,H
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";
import {
  ObservationEnvelope,
  validateObservationPrivacy,
  computeEnvelopeHash,
} from "../contracts/observation";

export type FaseEvento =
  | "dictado"
  | "transcripcion"
  | "revision"
  | "manejo"
  | "autorizacion"
  | "ingesta"
  | "grafo"
  | "captura";

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
  // OBS-1 Extended Fields
  eventUuid?: string | null;
  idempotencyKey?: string | null;
  schemaVersion?: string | null;
  outcome?: string | null;
  component?: string | null;
  causationId?: string | null;
  attemptId?: string | null;
  sequence?: number | null;
  sessionId?: string | null;
  releaseSha?: string | null;
  durationMs?: number | null;
  metrics?: Record<string, unknown> | null;
  reasonCode?: string | null;
  privacyClass?: string | null;
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
  // OBS-1 fields
  event_uuid?: string | null;
  idempotency_key?: string | null;
  schema_version?: string | null;
  outcome?: string | null;
  component?: string | null;
  causation_id?: string | null;
  attempt_id?: string | null;
  sequence?: number | null;
  session_id?: string | null;
  release_sha?: string | null;
  duration_ms?: number | null;
  metrics?: Record<string, unknown> | null;
  reason_code?: string | null;
  privacy_class?: string | null;
}

const FASES_VALIDAS = new Set<FaseEvento>([
  "dictado",
  "transcripcion",
  "revision",
  "manejo",
  "autorizacion",
  "ingesta",
  "grafo",
  "captura",
]);

const PREFIJOS_FASE: Record<FaseEvento, string> = {
  dictado: "DIC",
  transcripcion: "TRS",
  revision: "REV",
  manejo: "MAN",
  autorizacion: "AUT",
  ingesta: "ING",
  grafo: "GRA",
  captura: "CAP",
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
    fase TEXT NOT NULL CHECK (fase IN ('dictado','transcripcion','revision','manejo','autorizacion','ingesta','grafo','captura')),
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
    event_hash TEXT,
    event_uuid UUID UNIQUE,
    idempotency_key TEXT,
    schema_version TEXT DEFAULT '1.0',
    outcome TEXT,
    component TEXT,
    causation_id UUID,
    attempt_id TEXT,
    sequence BIGINT,
    session_id TEXT,
    release_sha TEXT,
    duration_ms INTEGER,
    metrics JSONB,
    reason_code TEXT,
    privacy_class TEXT DEFAULT 'SYSTEM_AUDIT'
  );`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_fase_idx ON eventos_sistema(fase);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_correlacion_idx ON eventos_sistema(correlacion_id);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_volcado_idx ON eventos_sistema(volcado_id);`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_servidor_idx ON eventos_sistema(servidor_en DESC);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS eventos_sistema_idempotency_key_idx ON eventos_sistema(idempotency_key) WHERE idempotency_key IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_session_idx ON eventos_sistema(session_id) WHERE session_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS eventos_sistema_event_uuid_idx ON eventos_sistema(event_uuid) WHERE event_uuid IS NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS eventos_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_uuid UUID NOT NULL UNIQUE,
    correlacion_id UUID NOT NULL,
    idempotency_key TEXT,
    payload JSONB NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDING' CHECK (estado IN ('PENDING', 'PROCESSED', 'FAILED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_ultimo TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    procesado_en TIMESTAMPTZ
  );`,
  `CREATE INDEX IF NOT EXISTS eventos_outbox_estado_idx ON eventos_outbox(estado) WHERE estado = 'PENDING';`,
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

export interface IngestBatchResultItem {
  event_uuid?: string;
  status: "inserted" | "duplicate" | "rejected";
  reason?: string;
}

export interface IngestBatchResult {
  accepted: number;
  duplicates: number;
  rejected: number;
  results: IngestBatchResultItem[];
}

/**
 * Registra o ingiere un lote de eventos/observaciones con durabilidad,
 * deduplicación por event_uuid/idempotency_key e integridad de cadena hash.
 */
export async function registrarEventosBatch(
  items: (RegistrarEventoParams | ObservationEnvelope)[],
  batchIdempotencyKey?: string | null
): Promise<IngestBatchResult> {
  await asegurarTablaEventosSistema();
  const db = getDb();

  const response: IngestBatchResult = {
    accepted: 0,
    duplicates: 0,
    rejected: 0,
    results: [],
  };

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];

    // Map ObservationEnvelope or RegistrarEventoParams to unified format
    let params: RegistrarEventoParams;
    if ("event_uuid" in raw && "event_name" in raw) {
      const obs = raw as ObservationEnvelope;
      const privacyCheck = validateObservationPrivacy(obs);
      if (!privacyCheck.valid) {
        response.rejected++;
        response.results.push({
          event_uuid: obs.event_uuid,
          status: "rejected",
          reason: privacyCheck.reason || "Violación de privacidad o datos inválidos",
        });
        continue;
      }

      // Convert phase to valid FaseEvento
      let faseMapped: FaseEvento = "captura";
      if (FASES_VALIDAS.has(obs.phase as FaseEvento)) {
        faseMapped = obs.phase as FaseEvento;
      }

      // Format eventId as e.g. CAP-001 or DIC-001
      const prefijo = PREFIJOS_FASE[faseMapped] || "CAP";
      const eventIdFormatted = `${prefijo}-${String((obs.sequence || idx + 1) % 1000).padStart(3, "0")}`;

      params = {
        fase: faseMapped,
        eventId: eventIdFormatted,
        estado: obs.severity === "ERROR" || obs.severity === "CRITICAL" ? "FAIL" : "OK",
        mensaje: cleanSecretos(obs.event_name, 1000),
        detalle: obs.metrics ? { metrics: obs.metrics, component: obs.component } : { component: obs.component },
        volcadoId: obs.volcado_id,
        version: obs.version,
        sha256: obs.sha256,
        correlacionId: obs.correlation_id,
        clienteEn: obs.client_time,
        eventUuid: obs.event_uuid,
        idempotencyKey: batchIdempotencyKey ? `${batchIdempotencyKey}-${obs.event_uuid}` : obs.event_uuid,
        schemaVersion: obs.schema_version,
        outcome: obs.outcome,
        component: obs.component,
        causationId: obs.causation_id,
        attemptId: obs.attempt_id,
        sequence: obs.sequence,
        sessionId: obs.session_id,
        releaseSha: obs.release_sha,
        durationMs: obs.duration_ms,
        metrics: obs.metrics,
        reasonCode: obs.reason_code,
        privacyClass: obs.privacy_class,
      };
    } else {
      params = raw as RegistrarEventoParams;
    }

    if (!FASES_VALIDAS.has(params.fase) || !validarEventId(params.fase, params.eventId)) {
      response.rejected++;
      response.results.push({
        event_uuid: params.eventUuid || undefined,
        status: "rejected",
        reason: `Fase (${params.fase}) o event_id (${params.eventId}) inválido`,
      });
      continue;
    }

    const correlacionId = params.correlacionId || randomUUID();
    const eventUuid = params.eventUuid || randomUUID();
    const idempotencyKey = params.idempotencyKey || null;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Advisory lock based on correlation_id to prevent hash chain concurrency races
      const lockKey = Math.abs(
        correlacionId.split("-").reduce((acc, part) => acc ^ parseInt(part.slice(0, 8), 16), 0)
      );
      await client.query("SELECT pg_advisory_xact_lock($1)", [lockKey]);

      // Check for deduplication by event_uuid or idempotency_key
      const dupCheck = await client.query(
        `SELECT id FROM eventos_sistema WHERE event_uuid = $1 OR (idempotency_key IS NOT NULL AND idempotency_key = $2) LIMIT 1`,
        [eventUuid, idempotencyKey]
      );

      if (dupCheck.rows.length > 0) {
        await client.query("COMMIT");
        response.duplicates++;
        response.results.push({
          event_uuid: eventUuid,
          status: "duplicate",
          reason: "Evento duplicado omitido idénticamente (idempotente)",
        });
        continue;
      }

      // Chain Hash per correlation_id
      const lastRes = await client.query(
        `SELECT event_hash FROM eventos_sistema
         WHERE correlacion_id = $1
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [correlacionId]
      );

      const hashAnterior =
        lastRes.rows.length > 0 && lastRes.rows[0].event_hash
          ? String(lastRes.rows[0].event_hash)
          : "0".repeat(64);

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

      const canonical = JSON.stringify({
        correlacion_id: correlacionId,
        event_uuid: eventUuid,
        fase: params.fase,
        event_id: params.eventId,
        estado: params.estado,
        mensaje: mensajeLimpio,
        volcado_id: params.volcadoId ?? null,
        version: params.version ?? null,
        sha256: params.sha256 ?? null,
        sequence: params.sequence ?? null,
        session_id: params.sessionId ?? null,
        detalle: detalleJson,
      });

      const eventHash = sha256Hex(hashAnterior + canonical);

      await client.query(
        `INSERT INTO eventos_sistema (
          fase, event_id, estado, mensaje, detalle,
          volcado_id, version, sha256, correlacion_id, cliente_en,
          hash_anterior, event_hash, event_uuid, idempotency_key,
          schema_version, outcome, component, causation_id, attempt_id,
          sequence, session_id, release_sha, duration_ms, metrics,
          reason_code, privacy_class
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
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
          eventUuid,
          idempotencyKey,
          params.schemaVersion || "1.0",
          params.outcome || "SUCCESS",
          params.component || "system",
          params.causationId ?? null,
          params.attemptId ?? null,
          params.sequence ?? null,
          params.sessionId ?? null,
          params.releaseSha ?? null,
          params.durationMs ?? null,
          params.metrics ? JSON.stringify(params.metrics) : null,
          params.reasonCode ?? null,
          params.privacyClass || "SYSTEM_AUDIT",
        ]
      );

      await client.query("COMMIT");
      response.accepted++;
      response.results.push({
        event_uuid: eventUuid,
        status: "inserted",
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("[registrarEventosBatch] Error registrando evento, mandando a Outbox:", err);

      // Save to outbox for retry/durability
      try {
        await db.query(
          `INSERT INTO eventos_outbox (event_uuid, correlacion_id, idempotency_key, payload, estado, error_ultimo)
           VALUES ($1, $2, $3, $4, 'PENDING', $5)
           ON CONFLICT (event_uuid) DO NOTHING`,
          [eventUuid, correlacionId, idempotencyKey, JSON.stringify(params), String(err)]
        );
      } catch (outboxErr) {
        console.error("[registrarEventosBatch] Error crítico al guardar en outbox:", outboxErr);
      }

      response.rejected++;
      response.results.push({
        event_uuid: eventUuid,
        status: "rejected",
        reason: `Error de base de datos (guardado en Outbox): ${String(err)}`,
      });
    } finally {
      if (typeof client.release === "function") {
        client.release();
      }
    }
  }

  return response;
}

/**
 * Función pública para registrar un evento individual del sistema de forma NO-BLOQUEANTE.
 */
export async function registrarEvento(params: RegistrarEventoParams): Promise<boolean> {
  const res = await executeWithTimeout(registrarEventosBatch([params]), 3000, {
    accepted: 0,
    duplicates: 0,
    rejected: 1,
    results: [],
  });
  return res.accepted > 0 || res.duplicates > 0;
}

/**
 * Procesa eventos pendientes acumulados en el Outbox.
 */
export async function procesarOutbox(): Promise<{ procesados: number; fallidos: number }> {
  await asegurarTablaEventosSistema();
  const db = getDb();

  const pending = await db.query(
    `SELECT id, event_uuid, payload FROM eventos_outbox WHERE estado = 'PENDING' AND retry_count < 5 LIMIT 100`
  );

  let procesados = 0;
  let fallidos = 0;

  for (const row of pending.rows) {
    try {
      const payload: RegistrarEventoParams = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      const res = await registrarEventosBatch([payload]);

      if (res.accepted > 0 || res.duplicates > 0) {
        await db.query(
          `UPDATE eventos_outbox SET estado = 'PROCESSED', procesado_en = NOW() WHERE id = $1`,
          [row.id]
        );
        procesados++;
      } else {
        await db.query(
          `UPDATE eventos_outbox SET retry_count = retry_count + 1, error_ultimo = $2 WHERE id = $1`,
          [row.id, res.results[0]?.reason || "Error de reintento outbox"]
        );
        fallidos++;
      }
    } catch (err) {
      await db.query(
        `UPDATE eventos_outbox SET retry_count = retry_count + 1, error_ultimo = $2 WHERE id = $1`,
        [row.id, String(err)]
      );
      fallidos++;
    }
  }

  return { procesados, fallidos };
}
