// @l0 L0-002-R · Adapter and reconciler between CAP-0 ObservationEnvelope and OBS-1 ObservationEnvelope
import { ObservationEnvelope as OBS1Envelope, ObservationSeverity, ObservationOutcome, ObservationPrivacyClass } from "./observation";
import { ObservationEnvelope as CAP0Envelope, TelemetrySeverity, TelemetryOutcome, TelemetryPrivacyClass } from "./capture";

/**
 * Maps CAP-0 ObservationEnvelope to canonical OBS-1 ObservationEnvelope
 */
export function mapCap0ToObs1(cap: CAP0Envelope): OBS1Envelope {
  // Severity mapping
  const severityMap: Record<TelemetrySeverity, ObservationSeverity> = {
    info: "INFO",
    warning: "WARN",
    error: "ERROR",
    critical: "CRITICAL",
  };

  // Outcome mapping
  const outcomeMap: Record<TelemetryOutcome, ObservationOutcome> = {
    success: "SUCCESS",
    failure: "FAILURE",
    degraded: "PARTIAL",
  };

  // Privacy class mapping
  const privacyMap: Record<TelemetryPrivacyClass, ObservationPrivacyClass> = {
    public: "PUBLIC_METRIC",
    internal: "SYSTEM_AUDIT",
    confidential: "SYSTEM_AUDIT",
    telemetry_only: "ANONYMIZED_TELEMETRY",
  };

  return {
    schema_version: cap.schema_version,
    event_uuid: cap.event_uuid,
    event_name: cap.event_name,
    phase: cap.phase,
    severity: severityMap[cap.severity] || "INFO",
    outcome: outcomeMap[cap.outcome] || "SUCCESS",
    component: cap.component,
    correlation_id: cap.correlation_id,
    causation_id: cap.causation_id,
    attempt_id: cap.attempt_id,
    sequence: cap.sequence,
    session_id: cap.session_id,
    volcado_id: cap.terna?.volcado_id || null,
    version: cap.terna?.version || null,
    sha256: cap.terna?.sha256 || null,
    client_time: cap.client_time,
    server_time: cap.server_time,
    duration_ms: cap.duration_ms,
    metrics: cap.metrics,
    reason_code: cap.reason_code,
    privacy_class: privacyMap[cap.privacy_class] || "SYSTEM_AUDIT",
  };
}

/**
 * Maps OBS-1 ObservationEnvelope to CAP-0 ObservationEnvelope
 */
export function mapObs1ToCap0(obs: OBS1Envelope): CAP0Envelope {
  const severityMap: Record<ObservationSeverity, TelemetrySeverity> = {
    INFO: "info",
    WARN: "warning",
    ERROR: "error",
    CRITICAL: "critical",
  };

  const outcomeMap: Record<ObservationOutcome, TelemetryOutcome> = {
    SUCCESS: "success",
    FAILURE: "failure",
    PARTIAL: "degraded",
    SKIPPED: "success",
    PENDING: "degraded",
  };

  const privacyMap: Record<ObservationPrivacyClass, TelemetryPrivacyClass> = {
    PUBLIC_METRIC: "public",
    ANONYMIZED_TELEMETRY: "telemetry_only",
    SYSTEM_AUDIT: "internal",
  };

  return {
    schema_version: obs.schema_version,
    event_uuid: obs.event_uuid,
    event_name: obs.event_name,
    phase: obs.phase,
    severity: severityMap[obs.severity] || "info",
    outcome: outcomeMap[obs.outcome] || "success",
    component: obs.component,
    correlation_id: obs.correlation_id,
    causation_id: obs.causation_id ?? null,
    attempt_id: obs.attempt_id ?? "attempt-1",
    sequence: obs.sequence,
    session_id: obs.session_id,
    terna: obs.volcado_id && obs.version !== null && obs.version !== undefined && obs.sha256
      ? { volcado_id: obs.volcado_id, version: obs.version, sha256: obs.sha256 }
      : null,
    client_time: obs.client_time ?? new Date().toISOString(),
    server_time: obs.server_time ?? new Date().toISOString(),
    duration_ms: obs.duration_ms ?? 0,
    metrics: (obs.metrics as Record<string, string | number | boolean>) || {},
    reason_code: obs.reason_code ?? "NONE",
    privacy_class: privacyMap[obs.privacy_class] || "internal",
  };
}
