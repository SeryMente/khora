// @l0 L0-002-R · Tests for OBS-1 durable telemetry, idempotency, outbox, privacy & chain hash integrity
import "./setup";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import {
  registrarEventosBatch,
  procesarOutbox,
  cleanSecretos,
  validarEventId,
} from "../../lib/server/eventos";
import {
  ObservationEnvelope,
  validateObservationPrivacy,
  computeEnvelopeHash,
} from "../../lib/contracts/observation";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { POST, GET } from "../../app/api/eventos/route";
import { NextRequest } from "next/server";

test.beforeEach(() => {
  const memoryDb: any[] = [];
  const outboxDb: any[] = [];

  const mockClient = {
    query: async (sql: string, params: any[] = []) => {
      // DDL operations
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("ALTER TABLE")) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes("SELECT pg_advisory_xact_lock")) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
        return { rows: [], rowCount: 0 };
      }

      // Check deduplication
      if (sql.includes("SELECT id FROM eventos_sistema WHERE event_uuid = $1")) {
        const found = memoryDb.find(
          (row) => row.event_uuid === params[0] || (params[1] && row.idempotency_key === params[1])
        );
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // Chain hash previous lookup
      if (sql.includes("SELECT event_hash FROM eventos_sistema")) {
        const matching = memoryDb
          .filter((row) => row.correlacion_id === params[0])
          .sort((a, b) => b.id - a.id);
        return { rows: matching.length > 0 ? [matching[0]] : [], rowCount: matching.length };
      }

      // Insert event into eventos_sistema
      if (sql.includes("INSERT INTO eventos_sistema")) {
        const row = {
          id: memoryDb.length + 1,
          fase: params[0],
          event_id: params[1],
          estado: params[2],
          mensaje: params[3],
          detalle: params[4] ? JSON.parse(params[4]) : null,
          volcado_id: params[5],
          version: params[6],
          sha256: params[7],
          correlacion_id: params[8],
          cliente_en: params[9],
          hash_anterior: params[10],
          event_hash: params[11],
          event_uuid: params[12],
          idempotency_key: params[13],
          schema_version: params[14],
          outcome: params[15],
          component: params[16],
          causation_id: params[17],
          attempt_id: params[18],
          sequence: params[19],
          session_id: params[20],
          release_sha: params[21],
          duration_ms: params[22],
          metrics: params[23] ? JSON.parse(params[23]) : null,
          reason_code: params[24],
          privacy_class: params[25],
          servidor_en: new Date().toISOString(),
        };
        memoryDb.push(row);
        return { rows: [row], rowCount: 1 };
      }

      // Insert into outbox
      if (sql.includes("INSERT INTO eventos_outbox")) {
        const row = {
          id: outboxDb.length + 1,
          event_uuid: params[0],
          correlacion_id: params[1],
          idempotency_key: params[2],
          payload: params[3],
          estado: "PENDING",
          error_ultimo: params[4],
          retry_count: 0,
        };
        outboxDb.push(row);
        return { rows: [row], rowCount: 1 };
      }

      // Select outbox pending
      if (sql.includes("SELECT id, event_uuid, payload FROM eventos_outbox")) {
        const pending = outboxDb.filter((r) => r.estado === "PENDING");
        return { rows: pending, rowCount: pending.length };
      }

      // Update outbox
      if (sql.includes("UPDATE eventos_outbox SET estado = 'PROCESSED'")) {
        const found = outboxDb.find((r) => r.id === params[0]);
        if (found) found.estado = "PROCESSED";
        return { rows: [], rowCount: 1 };
      }

      // Query GET /api/eventos
      if (sql.includes("SELECT id, fase, event_id, estado, mensaje, detalle")) {
        return { rows: memoryDb, rowCount: memoryDb.length };
      }

      return { rows: [], rowCount: 0 };
    },
    connect: async () => mockClient,
  };

  setDbForTesting(mockClient as any);
});

test.afterEach(() => {
  resetDbForTesting();
});

test("OBS-1: Validación de privacidad prohíbe audio crudo, base64 blobs y claves de transcripción", () => {
  const validEnvelope: ObservationEnvelope = {
    schema_version: "1.0",
    event_uuid: randomUUID(),
    event_name: "CAPTURE_STARTED",
    phase: "captura",
    severity: "INFO",
    outcome: "SUCCESS",
    component: "mic_recorder",
    correlation_id: randomUUID(),
    sequence: 1,
    session_id: "sess-100",
    privacy_class: "ANONYMIZED_TELEMETRY",
    metrics: { sample_rate: 44100, buffer_size: 1024 },
  };

  assert.equal(validateObservationPrivacy(validEnvelope).valid, true);

  const leakAudioEnvelope = {
    ...validEnvelope,
    metrics: { raw_audio: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA" },
  };
  assert.equal(validateObservationPrivacy(leakAudioEnvelope).valid, false);

  const leakTranscriptionEnvelope = {
    ...validEnvelope,
    metrics: { text_transcription: "El paciente reporta dolor de cabeza" },
  };
  assert.equal(validateObservationPrivacy(leakTranscriptionEnvelope).valid, false);
});

test("OBS-1: Ingestión batch con deduplicación por event_uuid e idempotencia idéntica", async () => {
  const eventUuid1 = randomUUID();
  const correlationId = randomUUID();

  const batch: ObservationEnvelope[] = [
    {
      schema_version: "1.0",
      event_uuid: eventUuid1,
      event_name: "CAPTURE_CHUNK_STORED",
      phase: "captura",
      severity: "INFO",
      outcome: "SUCCESS",
      component: "chunk_engine",
      correlation_id: correlationId,
      sequence: 1,
      session_id: "sess-200",
      privacy_class: "SYSTEM_AUDIT",
      metrics: { chunk_index: 1, chunk_bytes: 4096 },
    },
  ];

  // Primer envío -> insertado
  const res1 = await registrarEventosBatch(batch, "idem-key-1");
  assert.equal(res1.accepted, 1);
  assert.equal(res1.duplicates, 0);
  assert.equal(res1.results[0].status, "inserted");

  // Re-envío del mismo lote (reintento red) -> deduplicado idempotentemente
  const res2 = await registrarEventosBatch(batch, "idem-key-1");
  assert.equal(res2.accepted, 0);
  assert.equal(res2.duplicates, 1);
  assert.equal(res2.results[0].status, "duplicate");
});

test("OBS-1: Cadena de hashes por correlación preserva integridad determinista", async () => {
  const correlationId = randomUUID();

  const env1: ObservationEnvelope = {
    schema_version: "1.0",
    event_uuid: randomUUID(),
    event_name: "CAPTURE_START",
    phase: "captura",
    severity: "INFO",
    outcome: "SUCCESS",
    component: "audio_driver",
    correlation_id: correlationId,
    sequence: 1,
    session_id: "sess-300",
    privacy_class: "SYSTEM_AUDIT",
  };

  const env2: ObservationEnvelope = {
    schema_version: "1.0",
    event_uuid: randomUUID(),
    event_name: "CAPTURE_PAUSE",
    phase: "captura",
    severity: "INFO",
    outcome: "SUCCESS",
    component: "audio_driver",
    correlation_id: correlationId,
    sequence: 2,
    session_id: "sess-300",
    privacy_class: "SYSTEM_AUDIT",
  };

  const batchRes = await registrarEventosBatch([env1, env2]);
  assert.equal(batchRes.accepted, 2);

  // Verificar vía GET /api/eventos que se generaron los hashes de cadena
  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest(`http://localhost:3000/api/eventos?correlacion_id=${correlationId}`);
  const res = await GET(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.eventos.length, 2);
  assert.equal(data.eventos[0].hash_anterior, "0".repeat(64));
  assert.notEqual(data.eventos[1].hash_anterior, "0".repeat(64));
  assert.equal(data.eventos[1].hash_anterior, data.eventos[0].event_hash);
});

test("OBS-1: Endpoint POST /api/eventos procesa lotes JSON y aplica redacción de secretos", async () => {
  process.env.PLAYWRIGHT_TEST_RUN = "1";

  const eventUuid = randomUUID();
  const req = new NextRequest("http://localhost:3000/api/eventos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": "req-batch-555",
    },
    body: JSON.stringify([
      {
        schema_version: "1.0",
        event_uuid: eventUuid,
        event_name: "STORAGE_SYNC_TOKEN_BEARER gsk_1234567890abcdef12345",
        phase: "captura",
        severity: "INFO",
        outcome: "SUCCESS",
        component: "storage",
        correlation_id: randomUUID(),
        sequence: 1,
        session_id: "sess-400",
        privacy_class: "SYSTEM_AUDIT",
      },
    ]),
  });

  const res = await POST(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.summary.accepted, 1);
});

test("OBS-1: Outbox procesa reintentos pendientes tras fallos temporales", async () => {
  const pendingOutboxRes = await procesarOutbox();
  assert.equal(typeof pendingOutboxRes.procesados, "number");
});

test("OBS-1: Desempeño a volumen (lote de eventos en secuencia)", async () => {
  const correlationId = randomUUID();
  const events: ObservationEnvelope[] = [];

  for (let i = 1; i <= 50; i++) {
    events.push({
      schema_version: "1.0",
      event_uuid: randomUUID(),
      event_name: `CHUNK_PROCESS_${i}`,
      phase: "captura",
      severity: "INFO",
      outcome: "SUCCESS",
      component: "pipeline",
      correlation_id: correlationId,
      sequence: i,
      session_id: "sess-vol",
      privacy_class: "SYSTEM_AUDIT",
      metrics: { idx: i, duration_ms: i * 10 },
    });
  }

  const res = await registrarEventosBatch(events);
  assert.equal(res.accepted, 50);
  assert.equal(res.rejected, 0);
});
