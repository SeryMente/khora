/**
 * Contrato de captura sin pérdida y autoobservación (CAP-0).
 * Define la máquina de estados de 11 estados, el diario de captura,
 * el envelope de autoobservación y los validadores de esquema e invariantes.
 */

export const CURRENT_CAPTURE_SCHEMA_VERSION = "1.0.0";

export type CaptureState =
  | "idle"
  | "starting"
  | "recording"
  | "pausing"
  | "paused"
  | "resuming"
  | "stopping"
  | "finalizing"
  | "complete"
  | "degraded"
  | "failed";

export const VALID_CAPTURE_STATES: readonly CaptureState[] = [
  "idle",
  "starting",
  "recording",
  "pausing",
  "paused",
  "resuming",
  "stopping",
  "finalizing",
  "complete",
  "degraded",
  "failed",
] as const;

export const ALLOWED_STATE_TRANSITIONS: Record<CaptureState, readonly CaptureState[]> = {
  idle: ["starting", "failed"],
  starting: ["recording", "degraded", "failed"],
  recording: ["pausing", "stopping", "degraded", "failed"],
  pausing: ["paused", "degraded", "failed"],
  paused: ["resuming", "stopping", "degraded", "failed"],
  resuming: ["recording", "degraded", "failed"],
  stopping: ["finalizing", "degraded", "failed"],
  finalizing: ["complete", "degraded", "failed"],
  complete: [],
  degraded: ["starting", "recording", "resuming", "stopping", "failed"],
  failed: [],
} as const;

export const TRANSIENT_STATE_TIMEOUTS: Record<
  string,
  { timeout_ms: number; fallback_state: CaptureState }
> = {
  starting: { timeout_ms: 10000, fallback_state: "failed" },
  pausing: { timeout_ms: 5000, fallback_state: "paused" },
  resuming: { timeout_ms: 5000, fallback_state: "recording" },
  stopping: { timeout_ms: 10000, fallback_state: "finalizing" },
  finalizing: { timeout_ms: 15000, fallback_state: "degraded" },
} as const;

export interface SourceTriplet {
  volcado_id: string;
  version: number;
  sha256: string;
}

export type JournalEntryTipo = "interim_snapshot" | "final";
export type UploadState = "pending" | "uploaded" | "ack_received" | "failed";

export interface CaptureJournalEntry {
  session_id: string;
  capture_epoch: number;
  recognition_epoch: number;
  sequence: number;
  result_index: number;
  tipo: JournalEntryTipo;
  texto: string;
  client_time: string;
  audio_part_index: number;
  recorder_epoch: number;
  start_ms: number;
  end_ms: number;
  bytes: number;
  sha256: string;
  upload_state: UploadState;
  ack_time: string | null;
  retry_count: number;
}

export type TelemetrySeverity = "info" | "warning" | "error" | "critical";
export type TelemetryOutcome = "success" | "failure" | "degraded";
export type TelemetryPrivacyClass = "public" | "internal" | "confidential" | "telemetry_only";

export interface ObservationEnvelope {
  schema_version: string;
  event_uuid: string;
  event_name: string;
  phase: string;
  severity: TelemetrySeverity;
  outcome: TelemetryOutcome;
  component: string;
  correlation_id: string;
  causation_id: string | null;
  attempt_id: string;
  sequence: number;
  session_id: string;
  terna?: SourceTriplet | null;
  client_time: string;
  server_time: string;
  duration_ms: number;
  metrics: Record<string, number | boolean | string>;
  reason_code: string;
  privacy_class: TelemetryPrivacyClass;
}

export interface CaptureSessionState {
  session_id: string;
  current_state: CaptureState;
  capture_epoch: number;
  recognition_epoch: number;
  recorder_epoch: number;
  last_sequence: number;
  audio_parts_total: number;
  audio_parts_acked: number[];
  declared_coverage_complete: boolean;
  entries: CaptureJournalEntry[];
}

/**
 * Valida si la transición de estado solicitada está permitida por la máquina de estados.
 */
export function validateStateTransition(
  fromState: CaptureState,
  toState: CaptureState
): { valid: boolean; error?: string } {
  if (!VALID_CAPTURE_STATES.includes(fromState)) {
    return { valid: false, error: `Estado de origen no válido: '${fromState}'` };
  }
  if (!VALID_CAPTURE_STATES.includes(toState)) {
    return { valid: false, error: `Estado de destino no válido: '${toState}'` };
  }

  const allowed = ALLOWED_STATE_TRANSITIONS[fromState];
  if (!allowed.includes(toState)) {
    return {
      valid: false,
      error: `Transición no permitida: '${fromState}' -> '${toState}'. Transiciones válidas desde '${fromState}': [${allowed.join(", ")}]`,
    };
  }

  return { valid: true };
}

/**
 * Valida la monotonicidad estricta de las secuencias en el diario de captura.
 */
export function validateJournalSequence(
  entries: CaptureJournalEntry[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let prevSequence = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry.sequence !== "number" || !Number.isInteger(entry.sequence) || entry.sequence < 1) {
      errors.push(`Entrada [${i}]: El número de secuencia (${entry.sequence}) debe ser un entero >= 1.`);
      continue;
    }
    if (entry.sequence <= prevSequence) {
      errors.push(
        `Secuencia no monotónica en entrada [${i}]: secuencia actual (${entry.sequence}) <= secuencia previa (${prevSequence}).`
      );
    }
    prevSequence = entry.sequence;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida que todas las partes de audio desde 1 hasta audioPartsTotal tengan su confirmación (ACK) registrada.
 */
export function validateAudioPartsAck(
  audioPartsTotal: number,
  ackedIndices: number[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (audioPartsTotal < 0) {
    errors.push(`Total de partes de audio inválido: ${audioPartsTotal}.`);
    return { valid: false, errors };
  }

  const ackedSet = new Set(ackedIndices);
  for (let part = 1; part <= audioPartsTotal; part++) {
    if (!ackedSet.has(part)) {
      errors.push(`Parte de audio ${part} de ${audioPartsTotal} falta por recibir ACK de subida.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida si un callback entrante pertenece a la época activa.
 * Si pertenece a una época antigua (callback de epoch vencida), debe ignorarse.
 */
export function validateEpochCallback(
  activeEpoch: number,
  callbackEpoch: number
): { valid: boolean; isStale: boolean; error?: string } {
  if (callbackEpoch < activeEpoch) {
    return {
      valid: false,
      isStale: true,
      error: `Callback ignorado: callback epoch (${callbackEpoch}) es vencida respecto a la época activa (${activeEpoch}).`,
    };
  }
  if (callbackEpoch > activeEpoch) {
    return {
      valid: false,
      isStale: false,
      error: `Callback no válido: callback epoch (${callbackEpoch}) es superior a la época activa (${activeEpoch}).`,
    };
  }
  return { valid: true, isStale: false };
}

/**
 * Palabras clave y patrones prohibidos en telemetría para evitar fugas de texto o audio crudo.
 */
const FORBIDDEN_TELEMETRY_KEYS = [
  "raw_text",
  "raw_audio",
  "texto",
  "audio",
  "audio_bytes",
  "transcript_raw",
  "verbatim",
  "payload_bytes_raw",
  "speech_raw",
];

/**
 * Valida el Envelope de Autoobservación garantizando que NO contenga texto ni audio crudo en telemetría.
 */
export function validateObservationEnvelope(raw: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["El envelope de autoobservación debe ser un objeto JSON válido."] };
  }

  const env = raw as Partial<ObservationEnvelope>;

  // 1. Version
  if (typeof env.schema_version !== "string" || !env.schema_version.startsWith("1.")) {
    errors.push(`Versión de esquema inválida o incompatible: ${String(env.schema_version)}.`);
  }

  // 2. Event UUID
  if (
    typeof env.event_uuid !== "string" ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(env.event_uuid)
  ) {
    errors.push("event_uuid debe ser un UUID válido.");
  }

  // 3. Event name, phase, component, correlation_id, attempt_id
  for (const field of ["event_name", "phase", "component", "correlation_id", "attempt_id"] as const) {
    if (typeof env[field] !== "string" || (env[field] as string).trim().length === 0) {
      errors.push(`Campo obligatorio '${field}' falta o está vacío.`);
    }
  }

  // 4. Severity
  if (!["info", "warning", "error", "critical"].includes(env.severity as string)) {
    errors.push(`severity no válida: ${String(env.severity)}.`);
  }

  // 5. Outcome
  if (!["success", "failure", "degraded"].includes(env.outcome as string)) {
    errors.push(`outcome no válido: ${String(env.outcome)}.`);
  }

  // 6. Sequence
  if (typeof env.sequence !== "number" || !Number.isInteger(env.sequence) || env.sequence < 1) {
    errors.push("sequence debe ser un entero >= 1.");
  }

  // 7. Privacy class
  if (!["public", "internal", "confidential", "telemetry_only"].includes(env.privacy_class as string)) {
    errors.push(`privacy_class no válida: ${String(env.privacy_class)}.`);
  }

  // 8. Prohibición de texto o audio crudo en el objeto completo o en metrics
  const objKeys = Object.keys(env);
  for (const key of objKeys) {
    if (FORBIDDEN_TELEMETRY_KEYS.includes(key.toLowerCase())) {
      errors.push(`Fuga de privacidad detectada: El envelope contiene la propiedad prohibida '${key}'.`);
    }
  }

  if (env.metrics && typeof env.metrics === "object") {
    const metricKeys = Object.keys(env.metrics);
    for (const key of metricKeys) {
      if (FORBIDDEN_TELEMETRY_KEYS.includes(key.toLowerCase())) {
        errors.push(
          `Fuga de privacidad detectada en metrics: Las métricas contienen la clave prohibida '${key}'.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida si un estado de sesión cumple todas las condiciones obligatorias para alcanzar o permanecer en 'complete'.
 */
export function validateCompleteState(session: CaptureSessionState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar cero partes faltantes
  const partsAckRes = validateAudioPartsAck(session.audio_parts_total, session.audio_parts_acked);
  if (!partsAckRes.valid) {
    errors.push(...partsAckRes.errors);
  }

  // Verificar cobertura declarada
  if (session.declared_coverage_complete !== true) {
    errors.push("No se puede completar la sesión: la cobertura declarada no está marcada como completa.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida la integridad completa de una sesión de captura.
 */
export function validateCaptureSession(session: CaptureSessionState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!session.session_id || typeof session.session_id !== "string") {
    errors.push("session_id es obligatorio.");
  }

  if (!VALID_CAPTURE_STATES.includes(session.current_state)) {
    errors.push(`Estado de sesión no válido: ${session.current_state}`);
  }

  // Validar secuencia de entradas del diario
  const seqRes = validateJournalSequence(session.entries);
  if (!seqRes.valid) {
    errors.push(...seqRes.errors);
  }

  // Si está en complete, exigir cero partes faltantes y cobertura declarada
  if (session.current_state === "complete") {
    const completeRes = validateCompleteState(session);
    if (!completeRes.valid) {
      errors.push(...completeRes.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
