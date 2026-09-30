import test from "node:test";
import assert from "node:assert/strict";
import { mapObservationEventForStorage } from "@/lib/server/observation-runtime";

const baseBatch: any = {
  schema_version: "2.0",
  batch_id: "11111111-1111-4111-8111-111111111111",
  source: "harmonia-extension",
  extension_version: "0.3.4",
  session_id: "22222222-2222-4222-8222-222222222222",
  generated_at: "2026-09-30T21:00:00.000Z",
  first_event_at: "2026-09-30T20:59:59.000Z",
  last_event_at: "2026-09-30T21:00:00.000Z",
  partial: false,
  release_sha: "abcdef1234567",
  environment: {
    browser: { name: "Chrome", version: "154.0.0", user_agent: "Chrome/154" },
    platform: "Win32",
    language: "es-MX",
    timezone: "America/Mexico_City",
    online: true,
  },
  summary: {
    event_count: 1, severity_counts: { ERROR: 1 }, outcome_counts: { FAILURE: 1 },
    scope_counts: { bridge: 1 }, category_counts: { error: 1 },
    component_counts: { "live-caption": 1 }, failure_count: 1, warning_count: 0,
    expectation_gap_count: 0,
  },
};

test("ObservationEvent conserva scope, categoría y severidad al entrar al almacén SQL", () => {
  const mapped = mapObservationEventForStorage(baseBatch, {
    schema_version: "2.0",
    event_uuid: "33333333-3333-4333-8333-333333333333",
    event_name: "caption.bridge.failed",
    scope: "bridge",
    category: "error",
    severity: "ERROR",
    outcome: "FAILURE",
    component: "live-caption",
    correlation_id: "44444444-4444-4444-8444-444444444444",
    causation_id: null,
    attempt_id: "attempt-1",
    sequence: 1,
    session_id: baseBatch.session_id,
    client_time: "2026-09-30T21:00:00.000Z",
    duration_ms: 120,
    reason_code: "UIA_NOT_FOUND",
    diagnostic: { expected: "caption_node", actual: "missing", satisfied: false, failure_stage: "read", error_code: "UIA_NOT_FOUND", error_fingerprint: "UIA_NOT_FOUND:caption.bridge.failed" },
    metrics: { retries: 2, latency_ms: 120 },
    release_sha: baseBatch.release_sha,
    privacy_class: "ANONYMIZED_TELEMETRY",
  } as any);
  assert.equal(mapped.fase, "transcripcion");
  assert.equal(mapped.eventId, "TRS-001");
  assert.equal(mapped.estado, "FAIL");
  assert.equal((mapped.detalle as any).observation.scope, "bridge");
  assert.equal((mapped.detalle as any).observation.category, "error");
  assert.equal((mapped.detalle as any).observation.severity, "ERROR");
});
