// @l0 L0-002-R · @req TRACE-SESSION/010 · @req FORENSIC-REC/01
import test from "node:test";
import assert from "node:assert";
import { S3Client } from "@aws-sdk/client-s3";
import { b2ObjectUrl } from "../lib/storage/object-reference";

process.env.DATABASE_URL = "postgres://localhost:5432/mock";
process.env.X_KHORA_KEY = "dummy-key-32-chars-long-or-more-key";

import { getDb } from "../lib/server/neon";
import { cifrarTexto } from "../lib/server/cripto";
import { guardarDictado, registrarParteAudio } from "../lib/server/dictado";
import { ejecutarReconciliacionForense } from "../lib/server/reconciliation";

let volcadosDb: any[] = [];
let sesionesDb: any[] = [];
let partesDb: any[] = [];

function resetMockDb() {
  volcadosDb = [];
  sesionesDb = [];
  partesDb = [];
}

const db = getDb();
db.query = (async (sql: string, params?: any[]): Promise<any> => {
  const norm = sql.replace(/\s+/g, " ").trim();
  const p = params || [];

  if (norm.includes("COALESCE(MAX(version), 0)::int AS ultima")) {
    return { rows: [{ ultima: 0 }] };
  }

  if (norm.includes("INSERT INTO volcado_version")) {
    return { rows: [] };
  }

  if (norm.includes("INSERT INTO volcado")) {
    volcadosDb.push({
      id: p[0],
      texto: p[1],
      sha256: p[2],
      chars: p[3],
      titulo: p[4],
      origen: p[5],
      driver: p[6],
      usuario: p[7],
      estado: p[8],
      fuente: p[9],
      audio_url: p[10],
      audio_bytes: p[11],
      duracion_seg: p[12],
      pulido_aplicado: p[13],
      audio_partes: p[14],
      session_id: p[15],
      recibido_en: new Date(),
    });
    return { rows: [] };
  }

  if (norm.includes("INSERT INTO dictado_session")) {
    const existing = sesionesDb.find((s) => s.session_id === p[0]);
    if (existing) {
      if (norm.includes("volcado_id = EXCLUDED.volcado_id")) {
        existing.volcado_id = p[1];
        existing.estado = "complete";
      }
    } else {
      sesionesDb.push({
        session_id: p[0],
        volcado_id: p[1] || null,
        estado: "uploading",
        creado_en: new Date(),
      });
    }
    return { rows: [] };
  }

  if (norm.includes("INSERT INTO dictado_audio_parte")) {
    const existing = partesDb.find((pt) => pt.session_id === p[0] && pt.part_index === p[1]);
    if (!existing) {
      partesDb.push({
        session_id: p[0],
        part_index: p[1],
        blob_url: p[2],
        blob_path: p[3],
        bytes: p[4],
        sha256: p[5],
        fuente_audio: p[6],
        estado_verificacion: p[7],
        start_ms: p[8],
        end_ms: p[9],
        duracion_ms: p[10],
        original_name: p[11],
        mime_type: p[12],
        uploaded_at: new Date(),
      });
    }
    return { rows: [] };
  }

  if (norm.includes("UPDATE dictado_audio_parte SET volcado_id = $1 WHERE session_id = $2")) {
    for (const pt of partesDb) {
      if (pt.session_id === p[1]) {
        pt.volcado_id = p[0];
      }
    }
    return { rows: [] };
  }

  if (norm.includes("FROM volcado") && !norm.includes("volcado_version")) {
    return { rows: volcadosDb };
  }

  if (norm.includes("FROM dictado_session")) {
    return { rows: sesionesDb };
  }

  if (norm.includes("FROM dictado_audio_parte")) {
    return { rows: partesDb };
  }

  return { rows: [] };
}) as any;

(db as any).connect = async () => ({
  query: db.query.bind(db),
  release: () => undefined,
});

test("A. A session accepts a verified audio part with its SHA-256", async () => {
  resetMockDb();

  const sessionId = "test-session-123";
  await registrarParteAudio({
    sessionId,
    partIndex: 1,
    blobUrl: "https://blob.vercel-storage.com/part-1.webm.khc",
    bytes: 1024,
    sha256: "b".repeat(64),
    estadoVerificacion: "verificado",
  });

  const session = sesionesDb.find((s) => s.session_id === sessionId);
  assert.ok(session, "La sesión debe existir");
  assert.equal(session.estado, "uploading");
  const part = partesDb.find((p) => p.session_id === sessionId && p.part_index === 1);
  assert.ok(part, "La parte debe quedar persistida");
  assert.equal(part.sha256, "b".repeat(64));
  assert.equal(part.estado_verificacion, "verificado");
});

test("B & C. Audio capture rejects a missing session identity before database access", async () => {
  resetMockDb();

  await assert.rejects(
    guardarDictado({
      texto: "Texto salvaguardado cuando falla el audio",
      sessionId: null,
      audioUrl: null,
      audioBytes: null,
    }),
    /toda captura requiere sessionId/i,
  );
});

test("E. Reconciliation Classification Metrics", async () => {
  resetMockDb();

  volcadosDb.push({
    id: "v-exact-1",
    folio: 1,
    session_id: "s-exact-1",
    texto: cifrarTexto("Exact match text"),
    sha256: "hash1",
    chars: 16,
    recibido_en: new Date(),
  });

  sesionesDb.push({
    session_id: "s-exact-1",
    volcado_id: "v-exact-1",
    estado: "complete",
  });

  partesDb.push({
    session_id: "s-exact-1",
    part_index: 0,
    blob_url: "https://blob.vercel-storage.com/dictado/s-exact-1/0.webm.khc",
    bytes: 2048,
  });

  const summary = await ejecutarReconciliacionForense("DRY_RUN");

  assert.strictEqual(summary.mode, "DRY_RUN");
  assert.strictEqual(summary.classifications.EXACT_MATCH, 1);
  const exactItem = summary.items.find((it) => it.sessionId === "s-exact-1");
  assert.ok(exactItem);
  assert.strictEqual(exactItem.classification, "EXACT_MATCH");
});


test("un inventario Blob/B2 incompleto nunca etiqueta audio como MISSING", async () => {
  resetMockDb();
  const names = [
    "BLOB_READ_WRITE_TOKEN",
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_KEY_ID",
    "KHORA_B2_APPLICATION_KEY",
  ];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];

  volcadosDb.push({
    id: "v-audio-unverified",
    folio: 9001,
    session_id: null,
    audio_url: null,
    audio_bytes: 2048,
    duracion_seg: 5,
    audio_partes: null,
    recibido_en: new Date(),
  });

  try {
    const summary = await ejecutarReconciliacionForense("DRY_RUN");
    const item = summary.items.find((entry) => entry.volcadoId === "v-audio-unverified");
    assert.equal(summary.inventory.complete, false);
    assert.equal(summary.inventory.vercelBlob.status, "not_configured");
    assert.equal(summary.inventory.backblazeB2.status, "not_configured");
    assert.equal(item?.classification, "AMBIGUOUS");
    assert.equal(summary.classifications.MISSING, 0);
    assert.match(item?.evidence || "", /evidencia suficiente|inventario/i);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("una configuración B2 parcial no se presenta como inventario completo", async () => {
  resetMockDb();
  const names = [
    "BLOB_READ_WRITE_TOKEN",
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_KEY_ID",
    "KHORA_B2_APPLICATION_KEY",
  ];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  process.env.KHORA_B2_BUCKET_NAME = "khora-custodia-e2e-synthetic";

  volcadosDb.push({
    id: "v-audio-no-provider-b2",
    folio: 9002,
    session_id: null,
    audio_url: null,
    audio_bytes: 4096,
    duracion_seg: 8,
    audio_partes: null,
    recibido_en: new Date(),
  });

  try {
    const summary = await ejecutarReconciliacionForense("DRY_RUN");
    const item = summary.items.find((entry) => entry.volcadoId === "v-audio-no-provider-b2");
    assert.equal(summary.inventory.vercelBlob.status, "not_configured");
    assert.equal(summary.inventory.backblazeB2.status, "incomplete");
    assert.equal(summary.inventory.complete, false);
    assert.equal(item?.classification, "AMBIGUOUS");
    assert.equal(summary.classifications.MISSING, 0);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("el auditor reconoce referencias y huérfanos de objetos B2 migrados sin sessionId en el pathname", async () => {
  resetMockDb();
  const names = [
    "BLOB_READ_WRITE_TOKEN",
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_REGION",
    "KHORA_B2_KEY_ID",
    "KHORA_B2_APPLICATION_KEY",
  ];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  const originalSend = S3Client.prototype.send;
  const bucket = "khora-custodia-e2e-test";
  const region = "us-east-005";
  const key = "khora/dictado/migrated/vercel-blob/synthetic-object.khc";
  const url = b2ObjectUrl(key, { bucket, region });
  for (const name of names) delete process.env[name];
  process.env.KHORA_B2_BUCKET_NAME = bucket;
  process.env.KHORA_B2_REGION = region;
  process.env.KHORA_B2_KEY_ID = "synthetic-key-id";
  process.env.KHORA_B2_APPLICATION_KEY = "synthetic-application-key";
  (S3Client.prototype as any).send = async () => ({
    Contents: [{ Key: key, Size: 512, LastModified: new Date("2026-11-01T00:00:00.000Z") }],
    IsTruncated: false,
  });

  try {
    const orphanSummary = await ejecutarReconciliacionForense("DRY_RUN");
    assert.equal(orphanSummary.inventory.backblazeB2.status, "complete");
    assert.equal(orphanSummary.totalBlobs, 1);
    assert.ok(orphanSummary.items.some((item) =>
      item.classification === "AMBIGUOUS" && item.sessionId === null && item.candidateBlobs.includes(url)));

    resetMockDb();
    const sessionId = "migrated-session-001";
    volcadosDb.push({
      id: "v-migrated-b2",
      folio: 9003,
      session_id: sessionId,
      audio_url: url,
      audio_bytes: 512,
      duracion_seg: 2,
      audio_partes: null,
      recibido_en: new Date(),
    });
    sesionesDb.push({ session_id: sessionId, volcado_id: "v-migrated-b2", estado: "complete" });
    partesDb.push({
      id: "p-migrated-b2",
      session_id: sessionId,
      volcado_id: "v-migrated-b2",
      part_index: 1,
      blob_url: url,
      blob_path: key,
      bytes: 512,
      sha256: "a".repeat(64),
      estado: "uploaded",
    });

    const referencedSummary = await ejecutarReconciliacionForense("DRY_RUN");
    assert.equal(referencedSummary.totalBlobs, 1);
    assert.ok(referencedSummary.items.some((item) =>
      item.volcadoId === "v-migrated-b2" && item.classification === "EXACT_MATCH" && item.candidateBlobs.includes(url)));
    assert.equal(referencedSummary.classifications.AMBIGUOUS, 0);
  } finally {
    (S3Client.prototype as any).send = originalSend;
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});