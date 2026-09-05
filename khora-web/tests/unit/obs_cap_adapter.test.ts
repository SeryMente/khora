// @l0 L0-002-R · Tests for CAP/OBS envelope adapter compatibility
import "./setup";
import test from "node:test";
import assert from "node:assert/strict";
import { mapCap0ToObs1, mapObs1ToCap0 } from "../../lib/contracts/obs_cap_adapter";
import { ObservationEnvelope as CAP0Envelope } from "../../lib/contracts/capture";
import { ObservationEnvelope as OBS1Envelope } from "../../lib/contracts/observation";

test("mapCap0ToObs1 bijectively transforms CAP-0 envelope to OBS-1 envelope", () => {
  const cap0: CAP0Envelope = {
    schema_version: "1.0.0",
    event_uuid: "11111111-2222-3333-4444-555555555555",
    event_name: "CAPTURE_STARTED",
    phase: "captura",
    severity: "critical",
    outcome: "degraded",
    component: "mic",
    correlation_id: "66666666-7777-8888-9999-000000000000",
    causation_id: null,
    attempt_id: "att-1",
    sequence: 3,
    session_id: "sess-99",
    terna: {
      volcado_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      version: 1,
      sha256: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    client_time: "2025-01-01T00:00:00Z",
    server_time: "2025-01-01T00:00:01Z",
    duration_ms: 150,
    metrics: { sample_rate: 44100 },
    reason_code: "MIC_MUTED",
    privacy_class: "telemetry_only",
  };

  const obs1 = mapCap0ToObs1(cap0);
  assert.equal(obs1.event_uuid, cap0.event_uuid);
  assert.equal(obs1.severity, "CRITICAL");
  assert.equal(obs1.outcome, "PARTIAL");
  assert.equal(obs1.privacy_class, "ANONYMIZED_TELEMETRY");
  assert.equal(obs1.volcado_id, cap0.terna?.volcado_id);
  assert.equal(obs1.version, cap0.terna?.version);
  assert.equal(obs1.sha256, cap0.terna?.sha256);
});

test("mapObs1ToCap0 bijectively transforms OBS-1 envelope to CAP-0 envelope", () => {
  const obs1: OBS1Envelope = {
    schema_version: "1.0",
    event_uuid: "11111111-2222-3333-4444-555555555555",
    event_name: "TRANSCRIPTION_FAILED",
    phase: "transcripcion",
    severity: "ERROR",
    outcome: "FAILURE",
    component: "whisper",
    correlation_id: "66666666-7777-8888-9999-000000000000",
    causation_id: "77777777-8888-9999-0000-111111111111",
    attempt_id: "att-2",
    sequence: 5,
    session_id: "sess-100",
    volcado_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    version: 2,
    sha256: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    metrics: { duration: 120 },
    reason_code: "API_TIMEOUT",
    privacy_class: "SYSTEM_AUDIT",
  };

  const cap0 = mapObs1ToCap0(obs1);
  assert.equal(cap0.event_uuid, obs1.event_uuid);
  assert.equal(cap0.severity, "error");
  assert.equal(cap0.outcome, "failure");
  assert.equal(cap0.privacy_class, "internal");
  assert.equal(cap0.terna?.volcado_id, obs1.volcado_id);
  assert.equal(cap0.terna?.version, obs1.version);
  assert.equal(cap0.terna?.sha256, obs1.sha256);
});
