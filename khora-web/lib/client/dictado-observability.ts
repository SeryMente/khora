import type { ObservationEnvelope, ObservationOutcome, ObservationSeverity } from "../contracts/observation";

const QUEUE_KEY = "khora:dictado:observability:v1:pending";
const SEQUENCE_PREFIX = "khora:dictado:observability:v1:sequence:";
const CAUSATION_PREFIX = "khora:dictado:observability:v1:last-event:";
const MAX_BATCH = 40;
const MAX_FLUSH_ROUNDS = 8;

const ALLOWED_METRICS = new Set([
  "input_mode", "recognizer_attempt", "recognizer_state", "recorder_state",
  "permission_state", "recognition_supported", "continuous", "interim_results",
  "result_chars", "partial_chars", "segment_count", "reconnect_count", "abort_count",
  "elapsed_ms", "forced", "recorded_bytes", "media_chunk_bytes", "chunk_count",
  "part_index", "part_count", "upload_verified", "http_status", "network_online",
  "was_dictating", "editing", "confirmed", "chars_before", "chars_after", "active",
  "source_mode", "retry_count", "checkpoint_chars", "recovery_found", "state",
  "capture_state", "bridge_state", "response_ok", "permission_granted",
  "was_listening", "was_recording", "recognizer_is_current", "media_part_count",
  "media_part_bytes", "pending_chunks", "duration_since_result_ms",
  "shutdown_acknowledged", "checkpoint_ok", "chars_current", "result_index",
  "recognizer_active", "recorder_ready", "reconnect_attempt", "result_count",
]);

export interface DictadoObservationOptions {
  severity?: ObservationSeverity;
  outcome?: ObservationOutcome;
  reasonCode?: string | null;
  durationMs?: number | null;
  attemptId?: string | null;
  metrics?: Record<string, unknown> | null;
}

export interface DictadoObservationInput extends DictadoObservationOptions {
  sessionId: string;
  eventName: string;
}

let memoryQueue: ObservationEnvelope[] = [];
let flushInFlight: Promise<void> | null = null;
let flushTimer: ReturnType<typeof window.setTimeout> | null = null;
let retryTimer: ReturnType<typeof window.setTimeout> | null = null;
let retryAttempt = 0;
let listenersInstalled = false;
const sequenceFallback = new Map<string, number>();
const causationFallback = new Map<string, string>();

function storageOrNull(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

function uuid(): string {
  const api = globalThis.crypto;
  if (api && typeof api.randomUUID === "function") return api.randomUUID();
  if (!api || typeof api.getRandomValues !== "function") throw new Error("secure_uuid_unavailable");
  const bytes = new Uint8Array(16);
  api.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" + hex.slice(20);
}

function isEnvelope(value: unknown): value is ObservationEnvelope {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ObservationEnvelope>;
  return typeof event.event_uuid === "string" && typeof event.event_name === "string" &&
    typeof event.session_id === "string" && typeof event.sequence === "number";
}

function readQueue(): ObservationEnvelope[] {
  let stored: ObservationEnvelope[] = [];
  try {
    const raw = storageOrNull()?.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) stored = parsed.filter(isEnvelope);
  } catch {}
  const merged = new Map<string, ObservationEnvelope>();
  for (const event of stored) merged.set(event.event_uuid, event);
  for (const event of memoryQueue) merged.set(event.event_uuid, event);
  return Array.from(merged.values()).sort((a, b) =>
    a.session_id.localeCompare(b.session_id) || a.sequence - b.sequence
  );
}

function writeQueue(events: ObservationEnvelope[]): void {
  memoryQueue = events;
  try { storageOrNull()?.setItem(QUEUE_KEY, JSON.stringify(events)); } catch {
    // La cola de memoria mantiene el lote aunque sessionStorage no tenga cuota.
  }
}

function nextSequence(sessionId: string): number {
  let previous = sequenceFallback.get(sessionId) || 0;
  try {
    previous = Math.max(previous, Number(storageOrNull()?.getItem(SEQUENCE_PREFIX + sessionId) || 0));
  } catch {}
  for (const event of readQueue()) {
    if (event.session_id === sessionId) previous = Math.max(previous, event.sequence);
  }
  const next = previous + 1;
  sequenceFallback.set(sessionId, next);
  try { storageOrNull()?.setItem(SEQUENCE_PREFIX + sessionId, String(next)); } catch {}
  return next;
}

function previousEventId(sessionId: string): string | null {
  const queued = readQueue().filter((event) => event.session_id === sessionId)
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (queued) return queued.event_uuid;
  try {
    const stored = storageOrNull()?.getItem(CAUSATION_PREFIX + sessionId);
    if (stored) return stored;
  } catch {}
  return causationFallback.get(sessionId) || null;
}

function rememberEventId(sessionId: string, eventId: string): void {
  causationFallback.set(sessionId, eventId);
  try { storageOrNull()?.setItem(CAUSATION_PREFIX + sessionId, eventId); } catch {}
}

function safeMetrics(metrics?: Record<string, unknown> | null): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metrics || {})) {
    if (!ALLOWED_METRICS.has(key)) continue;
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
      safe[key] = value;
    } else if (typeof value === "string" && value.length <= 80 && /^[a-zA-Z0-9_.:-]*$/.test(value)) {
      safe[key] = value;
    }
  }
  return safe;
}

function safeReasonCode(value?: string | null): string | null {
  if (!value) return null;
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 80) || null;
}

function scheduleRetry(): void {
  if (typeof window === "undefined" || retryTimer !== null) return;
  const delayMs = Math.min(30_000, 1_000 * (2 ** Math.min(retryAttempt, 5)));
  retryAttempt = Math.min(retryAttempt + 1, 6);
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void enviarEventosObservabilidadDictado();
  }, delayMs);
}

function cancelRetry(resetAttempts = false): void {
  if (retryTimer !== null && typeof window !== "undefined") window.clearTimeout(retryTimer);
  retryTimer = null;
  if (resetAttempts) retryAttempt = 0;
}

function installRetryListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  const retry = () => { void enviarEventosObservabilidadDictado(); };
  window.addEventListener("online", retry);
  window.addEventListener("pagehide", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
}

/** Registers user-data telemetry metadata only; never passes transcript or audio content. */
export function registrarEventoObservabilidadDictado(input: DictadoObservationInput): string | null {
  if (typeof window === "undefined" || !input.sessionId) return null;
  installRetryListeners();
  const sessionId = String(input.sessionId).slice(0, 200);
  const eventName = String(input.eventName || "").toUpperCase();
  if (!/^[A-Z0-9_]{1,80}$/.test(eventName) ||
      /(TRANSCRIPT|TRANSCRIPTION|DICTATION|VERBATIM|TEXTO_DICTADO|PALABRAS_DICTADAS)/.test(eventName)) {
    return null;
  }

  const eventUuid = uuid();
  const sequence = nextSequence(sessionId);
  const previous = previousEventId(sessionId);
  const uuidSession = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
  const event: ObservationEnvelope = {
    schema_version: "1.1",
    event_uuid: eventUuid,
    event_name: eventName,
    phase: "dictado",
    severity: input.severity || "INFO",
    outcome: input.outcome || "SUCCESS",
    component: "ingreso_workspace",
    correlation_id: uuidSession ? sessionId : uuid(),
    causation_id: previous && previous !== eventUuid ? previous : null,
    attempt_id: input.attemptId ? String(input.attemptId).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 200) : null,
    sequence,
    session_id: sessionId,
    client_time: new Date().toISOString(),
    duration_ms: typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
      ? Math.max(0, input.durationMs) : null,
    metrics: safeMetrics(input.metrics),
    reason_code: safeReasonCode(input.reasonCode),
    privacy_class: "USER_DATA",
  };

  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
  rememberEventId(sessionId, eventUuid);
  if (flushTimer !== null) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void enviarEventosObservabilidadDictado();
  }, 100);
  return eventUuid;
}

async function flushPendingEvents(): Promise<void> {
  for (let round = 0; round < MAX_FLUSH_ROUNDS; round++) {
    const queue = readQueue();
    if (queue.length === 0) { cancelRetry(true); return; }
    const sessionId = queue[0].session_id;
    const batch = queue.filter((event) => event.session_id === sessionId).slice(0, MAX_BATCH);
    if (!batch.length) return;
    try {
      const first = batch[0];
      const last = batch[batch.length - 1];
      const response = await fetch("/api/eventos", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": "khora-dictado-" + sessionId + "-" + first.sequence + "-" + last.sequence,
        },
        body: JSON.stringify({ events: batch }),
      });
      const result = await response.json().catch(() => null);
      const summary = result?.summary;
      if (!response.ok || !summary ||
          Number(summary.accepted || 0) + Number(summary.duplicates || 0) !== batch.length ||
          Number(summary.rejected || 0) !== 0) {
        scheduleRetry();
        return;
      }
      const sentIds = new Set(batch.map((event) => event.event_uuid));
      writeQueue(readQueue().filter((event) => !sentIds.has(event.event_uuid)));
    } catch {
      // Se conserva la cola y se aplica backoff, aun si no llega otro checkpoint.
      scheduleRetry();
      return;
    }
  }
  if (readQueue().length > 0) scheduleRetry();
}

export function enviarEventosObservabilidadDictado(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (flushInFlight) return flushInFlight;
  cancelRetry(false);
  flushInFlight = flushPendingEvents().finally(() => { flushInFlight = null; });
  return flushInFlight;
}
