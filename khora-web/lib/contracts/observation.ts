// @l0 L0-002-R · Contract definition for OBS-1 auto-observation envelope
import { createHash } from "crypto";

export type ObservationSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type ObservationOutcome = "SUCCESS" | "FAILURE" | "PARTIAL" | "SKIPPED" | "PENDING";
export type ObservationPrivacyClass = "PUBLIC_METRIC" | "ANONYMIZED_TELEMETRY" | "SYSTEM_AUDIT";

export interface ObservationEnvelope {
  schema_version: string;
  event_uuid: string;
  event_name: string;
  phase: string;
  severity: ObservationSeverity;
  outcome: ObservationOutcome;
  component: string;
  correlation_id: string;
  causation_id?: string | null;
  attempt_id?: string | null;
  sequence: number;
  session_id: string;

  // Optional Terna
  volcado_id?: string | null;
  version?: number | null;
  sha256?: string | null;

  release_sha?: string | null;
  client_time?: string | null;
  server_time?: string | null;
  duration_ms?: number | null;
  metrics?: Record<string, unknown> | null;
  reason_code?: string | null;
  privacy_class: ObservationPrivacyClass;
}

// Regex patterns to detect potential verbatim text or audio leaks
const AUDIO_TEXT_LEAK_PATTERNS = [
  /data:audio\//i,
  /base64,/i,
  /\b[A-Za-z0-9+/]{100,}={0,2}\b/, // suspicious long base64 blob
  /\b(transcription|transcript|dictation|verbatim|texto_dictado|palabras_dictadas)\b/i,
];

/**
 * Validates that an observation envelope contains no raw text or audio data leaks.
 */
export function validateObservationPrivacy(envelope: ObservationEnvelope): { valid: boolean; reason?: string } {
  if (!envelope.schema_version || !envelope.event_uuid || !envelope.event_name || !envelope.phase) {
    return { valid: false, reason: "Campos requeridos faltantes en ObservationEnvelope" };
  }

  const jsonString = JSON.stringify(envelope);

  for (const pattern of AUDIO_TEXT_LEAK_PATTERNS) {
    if (pattern.test(jsonString)) {
      return { valid: false, reason: `Se detectó posible fuga de datos de audio/texto con el patrón ${pattern.source}` };
    }
  }

  // Check metrics for raw text keys or long strings (> 200 chars) that might contain verbatim transcriptions
  if (envelope.metrics) {
    for (const [key, val] of Object.entries(envelope.metrics)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("text") || lowerKey.includes("audio") || lowerKey.includes("speech") || lowerKey.includes("transcript")) {
        return { valid: false, reason: `Clave prohibida '${key}' encontrada en metrics` };
      }
      if (typeof val === "string" && val.length > 200) {
        return { valid: false, reason: `Valor de cadena demasiado largo (${val.length} caracteres) en clave '${key}' de metrics` };
      }
    }
  }

  return { valid: true };
}

/**
 * Computes canonical payload hash for an ObservationEnvelope.
 */
export function computeEnvelopeHash(envelope: ObservationEnvelope, previousHash: string = "0".repeat(64)): string {
  const canonical = JSON.stringify({
    schema_version: envelope.schema_version,
    event_uuid: envelope.event_uuid,
    event_name: envelope.event_name,
    phase: envelope.phase,
    severity: envelope.severity,
    outcome: envelope.outcome,
    component: envelope.component,
    correlation_id: envelope.correlation_id,
    causation_id: envelope.causation_id ?? null,
    attempt_id: envelope.attempt_id ?? null,
    sequence: envelope.sequence,
    session_id: envelope.session_id,
    volcado_id: envelope.volcado_id ?? null,
    version: envelope.version ?? null,
    sha256: envelope.sha256 ?? null,
    metrics: envelope.metrics ?? null,
    reason_code: envelope.reason_code ?? null,
    privacy_class: envelope.privacy_class,
  });

  return createHash("sha256").update(previousHash + canonical, "utf8").digest("hex");
}
