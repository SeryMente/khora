// @l0 L0-002-R · @req TRACE-SESSION/010 · @req FORENSIC-REC/01
import test from "node:test";
import assert from "node:assert";

process.env.DATABASE_URL = "postgres://localhost:5432/mock";
process.env.X_KHORA_KEY = "dummy-key-32-chars-long-or-more-key";

import { getDb } from "../lib/server/neon";
import { cifrarTexto, descifrarTexto } from "../lib/server/cripto";
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

test("A. Normal binding: sessionId -> partes -> volcado", async () => {
  resetMockDb();

  const sessionId = "test-session-123";
  await registrarParteAudio({
    sessionId,
    partIndex: 0,
    blobUrl: "https://blob.vercel-storage.com/part-0.webm.khc",
    bytes: 1024,
  });

  const res = await guardarDictado({
    texto: "Transcripción de prueba para sesión",
    sessionId,
    audioUrl: "https://blob.vercel-storage.com/part-0.webm.khc",
    audioBytes: 1024,
    duracionSeg: 15,
  });

  assert.strictEqual(res.sessionId, sessionId);
  const volcado = volcadosDb.find((v) => v.id === res.id);
  assert.ok(volcado, "El volcado debe haberse insertado");
  assert.strictEqual(volcado.session_id, sessionId);

  const session = sesionesDb.find((s) => s.session_id === sessionId);
  assert.ok(session, "La sesión debe existir");
  assert.strictEqual(session.volcado_id, res.id);
});

test("B & C. Audio failure recovery: text saved even if audio is missing", async () => {
  resetMockDb();

  const res = await guardarDictado({
    texto: "Texto salvaguardado cuando falla el audio",
    sessionId: null,
    audioUrl: null,
    audioBytes: null,
  });

  assert.ok(res.id);
  const volcado = volcadosDb.find((v) => v.id === res.id);
  assert.strictEqual(volcado.session_id, null);
  assert.strictEqual(descifrarTexto(volcado.texto), "Texto salvaguardado cuando falla el audio");
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
