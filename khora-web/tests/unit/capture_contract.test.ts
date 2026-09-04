import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_CAPTURE_SCHEMA_VERSION,
  VALID_CAPTURE_STATES,
  ALLOWED_STATE_TRANSITIONS,
  TRANSIENT_STATE_TIMEOUTS,
  CaptureJournalEntry,
  ObservationEnvelope,
  CaptureSessionState,
  validateStateTransition,
  validateJournalSequence,
  validateAudioPartsAck,
  validateEpochCallback,
  validateObservationEnvelope,
  validateCompleteState,
  validateCaptureSession,
} from "../../lib/contracts/capture";

const SAMPLE_SESSION_ID = "12345678-1234-4234-8234-123456789012";
const SAMPLE_EVENT_UUID = "87654321-4321-4321-8321-210987654321";

function createValidJournalEntry(sequence: number, audioPartIndex: number = 1): CaptureJournalEntry {
  return {
    session_id: SAMPLE_SESSION_ID,
    capture_epoch: 1,
    recognition_epoch: 1,
    sequence,
    result_index: sequence - 1,
    tipo: "final",
    texto: `Texto fragmento ${sequence}`,
    client_time: new Date().toISOString(),
    audio_part_index: audioPartIndex,
    recorder_epoch: 1,
    start_ms: (sequence - 1) * 1000,
    end_ms: sequence * 1000,
    bytes: 1024,
    sha256: "a".repeat(64),
    upload_state: "ack_received",
    ack_time: new Date().toISOString(),
    retry_count: 0,
  };
}

function createValidObservationEnvelope(): ObservationEnvelope {
  return {
    schema_version: CURRENT_CAPTURE_SCHEMA_VERSION,
    event_uuid: SAMPLE_EVENT_UUID,
    event_name: "capture.chunk_processed",
    phase: "recording",
    severity: "info",
    outcome: "success",
    component: "MediaRecorderDriver",
    correlation_id: "corr-123",
    causation_id: null,
    attempt_id: "att-1",
    sequence: 1,
    session_id: SAMPLE_SESSION_ID,
    client_time: new Date().toISOString(),
    server_time: new Date().toISOString(),
    duration_ms: 250,
    metrics: {
      chunk_bytes: 4096,
      latency_ms: 45,
      is_final: true,
    },
    reason_code: "CHUNK_ACKED",
    privacy_class: "telemetry_only",
  };
}

function createValidSession(): CaptureSessionState {
  return {
    session_id: SAMPLE_SESSION_ID,
    current_state: "recording",
    capture_epoch: 1,
    recognition_epoch: 1,
    recorder_epoch: 1,
    last_sequence: 2,
    audio_parts_total: 2,
    audio_parts_acked: [1, 2],
    declared_coverage_complete: true,
    entries: [createValidJournalEntry(1, 1), createValidJournalEntry(2, 2)],
  };
}

// ---------------------------------------------------------------------------
// PRUEBA 0: Casos válidos y constante de 11 estados
// ---------------------------------------------------------------------------
test("capture_contract: 11 valid states exist and valid session passes", () => {
  assert.equal(VALID_CAPTURE_STATES.length, 11);

  const session = createValidSession();
  const res = validateCaptureSession(session);
  assert.equal(res.valid, true, `Expected valid session, got errors: ${res.errors.join(", ")}`);
});

test("capture_contract: transient state timeouts have explicit fallback states", () => {
  assert.equal(TRANSIENT_STATE_TIMEOUTS.starting.fallback_state, "failed");
  assert.equal(TRANSIENT_STATE_TIMEOUTS.pausing.fallback_state, "paused");
  assert.equal(TRANSIENT_STATE_TIMEOUTS.resuming.fallback_state, "recording");
  assert.equal(TRANSIENT_STATE_TIMEOUTS.stopping.fallback_state, "finalizing");
  assert.equal(TRANSIENT_STATE_TIMEOUTS.finalizing.fallback_state, "degraded");
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 1: Secuencia NO monotónica debe FALLAR
// ---------------------------------------------------------------------------
test("capture_contract: FAILS on non-monotonic journal sequence", () => {
  const entries: CaptureJournalEntry[] = [
    createValidJournalEntry(1),
    createValidJournalEntry(3),
    createValidJournalEntry(2), // Decremento
  ];

  const res = validateJournalSequence(entries);
  assert.equal(res.valid, false, "Expected validation to fail on non-monotonic sequence");
  assert.ok(res.errors.some((e) => e.includes("Secuencia no monotónica")));

  // Probar duplicate sequence
  const dupEntries: CaptureJournalEntry[] = [
    createValidJournalEntry(1),
    createValidJournalEntry(1), // Duplicado
  ];
  const dupRes = validateJournalSequence(dupEntries);
  assert.equal(dupRes.valid, false);
  assert.ok(dupRes.errors.some((e) => e.includes("Secuencia no monotónica")));
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 2: Parte de audio sin ACK debe FALLAR
// ---------------------------------------------------------------------------
test("capture_contract: FAILS when an audio part lacks ACK", () => {
  const audioPartsTotal = 3;
  const ackedIndices = [1, 3]; // Falta la parte 2

  const res = validateAudioPartsAck(audioPartsTotal, ackedIndices);
  assert.equal(res.valid, false, "Expected validation to fail when part 2 lacks ACK");
  assert.ok(res.errors.some((e) => e.includes("Parte de audio 2 de 3 falta por recibir ACK")));
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 3: Callback de epoch vencida debe marcarse como vencido/fallar
// ---------------------------------------------------------------------------
test("capture_contract: FAILS/ignores callback from stale epoch", () => {
  const activeEpoch = 3;
  const staleEpoch = 2;

  const res = validateEpochCallback(activeEpoch, staleEpoch);
  assert.equal(res.valid, false);
  assert.equal(res.isStale, true);
  assert.ok(res.error?.includes("es vencida respecto a la época activa"));

  // Callback de la época activa debe pasar
  const currentRes = validateEpochCallback(activeEpoch, activeEpoch);
  assert.equal(currentRes.valid, true);
  assert.equal(currentRes.isStale, false);
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 4: Transición a 'complete' con partes faltantes debe FALLAR
// ---------------------------------------------------------------------------
test("capture_contract: FAILS complete state transition with missing audio parts or incomplete coverage", () => {
  const session = createValidSession();
  session.current_state = "complete";
  session.audio_parts_total = 3;
  session.audio_parts_acked = [1, 2]; // Parte 3 sin ACK

  let res = validateCaptureSession(session);
  assert.equal(res.valid, false, "Expected complete state to fail due to un-ACKed part 3");
  assert.ok(res.errors.some((e) => e.includes("falta por recibir ACK")));

  // Reparar ACKs pero marcar cobertura incompleta
  session.audio_parts_acked = [1, 2, 3];
  session.declared_coverage_complete = false;

  res = validateCaptureSession(session);
  assert.equal(res.valid, false, "Expected complete state to fail due to declared_coverage_complete false");
  assert.ok(res.errors.some((e) => e.includes("cobertura declarada no está marcada como completa")));
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 5: Presencia de texto/audio crudo en telemetría debe FALLAR
// ---------------------------------------------------------------------------
test("capture_contract: FAILS on telemetry envelope containing raw text or audio", () => {
  const env = createValidObservationEnvelope();

  // Test 1: Inyectar clave prohibida top-level 'raw_text'
  (env as any).raw_text = "Transcripción confidencial hablada";
  let res = validateObservationEnvelope(env);
  assert.equal(res.valid, false, "Expected envelope with raw_text property to fail validation");
  assert.ok(res.errors.some((e) => e.includes("Fuga de privacidad detectada")));

  // Test 2: Inyectar clave prohibida en metrics
  const cleanEnv = createValidObservationEnvelope();
  cleanEnv.metrics.raw_audio = "base64_audio_data_here";
  res = validateObservationEnvelope(cleanEnv);
  assert.equal(res.valid, false, "Expected envelope with raw_audio in metrics to fail validation");
  assert.ok(res.errors.some((e) => e.includes("Fuga de privacidad detectada en metrics")));

  // Test 3: Inyectar clave prohibida 'texto' o 'verbatim'
  const textEnv = createValidObservationEnvelope();
  (textEnv as any).texto = "palabras habladas";
  res = validateObservationEnvelope(textEnv);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("Fuga de privacidad detectada")));
});

// ---------------------------------------------------------------------------
// PRUEBA OBLIGATORIA 6: Transición NO permitida por la máquina de estados debe FALLAR
// ---------------------------------------------------------------------------
test("capture_contract: FAILS on invalid state transitions not allowed by state machine", () => {
  // Transición no permitida: idle -> complete directo
  let res = validateStateTransition("idle", "complete");
  assert.equal(res.valid, false, "Expected transition idle -> complete to fail");
  assert.ok(res.error?.includes("Transición no permitida"));

  // Transición no permitida: complete -> recording (complete es terminal)
  res = validateStateTransition("complete", "recording");
  assert.equal(res.valid, false, "Expected complete -> recording to fail");

  // Transición permitida: idle -> starting
  res = validateStateTransition("idle", "starting");
  assert.equal(res.valid, true);

  // Transición permitida: recording -> pausing
  res = validateStateTransition("recording", "pausing");
  assert.equal(res.valid, true);
});
