import type {
  ObservationBatch,
  ObservationEvent,
} from "@/lib/contracts/observation-batch";
import type { RegistrarEventoParams, FaseEvento, EstadoEvento } from "./eventos";
import { cleanSecretos, registrarEventosBatch } from "./eventos";

type ObservationScope = ObservationEvent["scope"];

const SCOPE_TO_PHASE: Record<ObservationScope, FaseEvento> = {
  capture: "captura",
  transcription: "transcripcion",
  integration: "manejo",
  ui: "revision",
  bridge: "transcripcion",
  storage: "manejo",
  network: "manejo",
  auth: "autorizacion",
  runtime: "manejo",
  deployment: "manejo",
  database: "manejo",
  unknown: "manejo",
};

const PHASE_PREFIX: Record<FaseEvento, string> = {
  dictado: "DIC",
  transcripcion: "TRS",
  revision: "REV",
  manejo: "MAN",
  autorizacion: "AUT",
  ingesta: "ING",
  grafo: "GRA",
  captura: "CAP",
};

function toEstado(outcome: ObservationEvent["outcome"]): EstadoEvento {
  switch (outcome) {
    case "SUCCESS": return "OK";
    case "FAILURE": return "FAIL";
    case "SKIPPED": return "SKIP";
    case "PENDING": return "START";
    case "PARTIAL": return "INFO";
  }
}

function cleanJson(value: unknown, max = 16000): Record<string, unknown> {
  try {
    const raw = cleanSecretos(JSON.stringify(value ?? {}), max);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return { redacted: true };
  }
}

function mapEvent(batch: ObservationBatch, event: ObservationEvent): RegistrarEventoParams {
  const fase = SCOPE_TO_PHASE[event.scope];
  const eventId = `${PHASE_PREFIX[fase]}-${String(event.sequence).padStart(3, "0")}`;
  const observation = {
    source: batch.source,
    batch_id: batch.batch_id,
    extension_version: batch.extension_version,
    partial: batch.partial,
    scope: event.scope,
    category: event.category,
    severity: event.severity,
    diagnostic: event.diagnostic ?? null,
    environment: batch.environment,
  };

  return {
    fase,
    eventId,
    estado: toEstado(event.outcome),
    mensaje: cleanSecretos(event.event_name, 1000),
    detalle: cleanJson({ observation }),
    correlacionId: event.correlation_id,
    clienteEn: event.client_time ?? null,
    eventUuid: event.event_uuid,
    idempotencyKey: `harmonia-runtime:${event.event_uuid}`,
    schemaVersion: event.schema_version,
    outcome: event.outcome,
    component: cleanSecretos(event.component, 200),
    causationId: event.causation_id ?? null,
    attemptId: event.attempt_id ?? null,
    sequence: event.sequence,
    sessionId: cleanSecretos(event.session_id, 200),
    releaseSha: event.release_sha ?? batch.release_sha ?? null,
    durationMs: event.duration_ms ?? null,
    metrics: cleanJson(event.metrics ?? {}),
    reasonCode: event.reason_code ?? null,
    privacyClass: "ANONYMIZED_TELEMETRY",
  };
}

export async function persistObservationBatchRuntime(batch: ObservationBatch) {
  const items = batch.events.map((event) => mapEvent(batch, event));
  const result = await registrarEventosBatch(items, `harmonia-runtime-batch:${batch.batch_id}`);

  return {
    batch_id: batch.batch_id,
    source: batch.source,
    session_id: batch.session_id,
    generated_at: batch.generated_at,
    accepted: result.accepted,
    duplicates: result.duplicates,
    rejected: result.rejected,
    total: batch.events.length,
    persisted: result.accepted + result.duplicates === batch.events.length,
  };
}

export function mapObservationEventForStorage(batch: ObservationBatch, event: ObservationEvent) {
  return mapEvent(batch, event);
}
