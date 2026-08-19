// @l0 L0-002-R · @req PIPELINE-OBSERVABILITY/REQ-1
import assert from "assert";
import test from "node:test";
import { Pool } from "pg";

// 1. Setup PG Pool prototype interception
let mockQueryCount = 0;
const queryLogs: { sql: string; params?: any[] }[] = [];

// Provide a default fallback/DATABASE_URL to bypass neon.ts verification
process.env.DATABASE_URL = "postgres://localhost:5432/mockdb";

const mockVolcados = [
  // 1. volcado archivado
  {
    id: "uuid-1",
    texto: "Texto archivado",
    texto_original: null,
    sha256: "sha-1",
    chars: 15,
    titulo: "A1",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "archivado",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/1",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 2. volcado pendiente_revision
  {
    id: "uuid-2",
    texto: "Texto pendiente",
    texto_original: null,
    sha256: "sha-2",
    chars: 15,
    titulo: "A2",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "pendiente_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/2",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 3. volcado en_revision
  {
    id: "uuid-3",
    texto: "Texto en revision",
    texto_original: null,
    sha256: "sha-3",
    chars: 17,
    titulo: "A3",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/3",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 4. volcado aprobado (listo_ingesta)
  {
    id: "uuid-4",
    texto: "Texto aprobado",
    texto_original: null,
    sha256: "sha-4",
    chars: 14,
    titulo: "A4",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "listo_ingesta",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/4",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: 1
  },
  // 5. volcado ingerido
  {
    id: "uuid-5",
    texto: "Texto ingerido",
    texto_original: null,
    sha256: "sha-5",
    chars: 14,
    titulo: "A5",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "ingerido",
    io_id: "io-555",
    intentos: 1,
    ultimo_error: null,
    ultimo_intento: new Date().toISOString(),
    audio_url: "http://audio.url/5",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: 1
  },
  // 6. ingesta fallida
  {
    id: "uuid-6",
    texto: "Texto fallido",
    texto_original: null,
    sha256: "sha-6",
    chars: 13,
    titulo: "A6",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "fallido",
    io_id: null,
    intentos: 1,
    ultimo_error: "Kernel uncontactable",
    ultimo_intento: new Date().toISOString(),
    audio_url: "http://audio.url/6",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: 1
  },
  // 7. dictado sin audio
  {
    id: "uuid-7",
    texto: "Texto dictado sin audio",
    texto_original: null,
    sha256: "sha-7",
    chars: 23,
    titulo: "A7",
    origen: "dictado",
    driver: "dictado",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: null,
    audio_bytes: null,
    duracion_seg: null,
    fuente: "dictado",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 8. audio sin texto
  {
    id: "uuid-8",
    texto: "",
    texto_original: null,
    sha256: "sha-8",
    chars: 0,
    titulo: "A8",
    origen: "dictado",
    driver: "dictado",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/8",
    audio_bytes: 200,
    duracion_seg: 25,
    fuente: "dictado",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 9. audio parcial
  {
    id: "uuid-9",
    session_id: "s-9",
    texto: "Audio parcial texto",
    texto_original: null,
    sha256: "sha-9",
    chars: 19,
    titulo: "A9",
    origen: "dictado",
    driver: "dictado",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/9",
    audio_bytes: 100,
    duracion_seg: 30,
    fuente: "dictado",
    pulido_aplicado: false,
    audio_partes: JSON.stringify([
      { parte: 1, url: "http://part1", bytes: 50 },
      { parte: 3, url: "http://part3", bytes: 50 }
    ]),
    version_aprobada: null
  },
  // 10. versión modificada
  {
    id: "uuid-10",
    texto: "Texto editado",
    texto_original: "Texto original",
    sha256: "sha-10-current",
    chars: 13,
    titulo: "A10",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: "http://audio.url/10",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  },
  // 11. provenance roto
  {
    id: "uuid-11",
    texto: "Texto provenance roto",
    texto_original: null,
    sha256: "sha-11",
    chars: 21,
    titulo: "A11",
    origen: "cora-ui",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "ingerido",
    io_id: null, // broken because estado is ingerido but io_id is null!
    intentos: 1,
    ultimo_error: null,
    ultimo_intento: new Date().toISOString(),
    audio_url: "http://audio.url/11",
    audio_bytes: 100,
    duracion_seg: 10,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: 1
  },
  // 12. entrada manual sin audio (no_aplica)
  {
    id: "uuid-12",
    texto: "Entrada manual legitima sin audio",
    texto_original: null,
    sha256: "sha-12",
    chars: 32,
    titulo: "Manual A12",
    origen: "manual",
    driver: "web",
    usuario: "user@example.com",
    recibido_en: new Date().toISOString(),
    estado: "en_revision",
    io_id: null,
    intentos: 0,
    ultimo_error: null,
    ultimo_intento: null,
    audio_url: null,
    audio_bytes: null,
    duracion_seg: null,
    fuente: "texto",
    pulido_aplicado: false,
    audio_partes: null,
    version_aprobada: null
  }
];

const mockVersions = [
  { volcado_id: "uuid-1", version: 1, sha256: "sha-1", chars: 15 },
  { volcado_id: "uuid-2", version: 1, sha256: "sha-2", chars: 15 },
  { volcado_id: "uuid-3", version: 1, sha256: "sha-3", chars: 17 },
  { volcado_id: "uuid-4", version: 1, sha256: "sha-4-original", chars: 14 },
  { volcado_id: "uuid-5", version: 1, sha256: "sha-5", chars: 14 },
  { volcado_id: "uuid-6", version: 1, sha256: "sha-6", chars: 13 },
  { volcado_id: "uuid-7", version: 1, sha256: "sha-7", chars: 23 },
  { volcado_id: "uuid-9", version: 1, sha256: "sha-9", chars: 19 },
  { volcado_id: "uuid-10", version: 1, sha256: "sha-10-original", chars: 14 },
  { volcado_id: "uuid-10", version: 2, sha256: "sha-10-current", chars: 13 },
  { volcado_id: "uuid-11", version: 1, sha256: "sha-11", chars: 21 },
  { volcado_id: "uuid-12", version: 1, sha256: "sha-12", chars: 32 }
];

const mockSessions = [
  { session_id: "s-9", volcado_id: "uuid-9", estado: "parcial", total_partes: 3 }
];

const mockNodosCounts = [
  { volcado_id: "uuid-5", n: 12 }
];

const mockAristasCounts = [
  { volcado_id: "uuid-5", n: 18 }
];

// Override Pool's query method
(Pool.prototype as any).query = async function (sql: any, params?: any[]) {
  mockQueryCount++;
  queryLogs.push({ sql, params });

  const sqlNormalized = sql.trim().toLowerCase();

  if (sqlNormalized.includes("select") && sqlNormalized.includes("dictado_session")) {
    return { rows: mockSessions };
  }

  if (sqlNormalized.includes("select") && sqlNormalized.includes("dictado_audio_parte")) {
    return { rows: [] };
  }

  if (sqlNormalized.includes("select") && sqlNormalized.includes("volcado") && !sqlNormalized.includes("volcado_version")) {
    if (params && params.length > 0 && typeof params[0] === "string" && params[0].startsWith("uuid-")) {
      const match = mockVolcados.find(v => v.id === params[0]);
      return { rows: match ? [match] : [] };
    }
    return { rows: mockVolcados };
  }

  if (sqlNormalized.includes("volcado_version")) {
    if (params && params.length > 0 && Array.isArray(params[0])) {
      const ids = params[0];
      const matched = mockVersions.filter(v => ids.includes(v.volcado_id));
      return { rows: matched };
    }
    if (params && params.length > 0 && typeof params[0] === "string") {
      const matched = mockVersions.filter(v => v.volcado_id === params[0]);
      return { rows: matched };
    }
    return { rows: mockVersions };
  }

  if (sqlNormalized.includes("nodos")) {
    if (params && params.length > 0 && Array.isArray(params[0])) {
      const ids = params[0];
      const matched = mockNodosCounts.filter(v => ids.includes(v.volcado_id));
      return { rows: matched };
    }
    if (params && params.length > 0 && typeof params[0] === "string") {
      const match = mockVolcados.find(v => v.id === params[0]);
      if (match && match.id === "uuid-5") {
        return { rows: Array(12).fill({ id: "node-id" }) };
      }
      return { rows: [] };
    }
    return { rows: mockNodosCounts };
  }

  if (sqlNormalized.includes("aristas")) {
    if (params && params.length > 0 && Array.isArray(params[0])) {
      const ids = params[0];
      const matched = mockAristasCounts.filter(v => ids.includes(v.volcado_id));
      return { rows: matched };
    }
    if (params && params.length > 0 && typeof params[0] === "string") {
      const match = mockVolcados.find(v => v.id === params[0]);
      if (match && match.id === "uuid-5") {
        return { rows: Array(18).fill({ id: "edge-id" }) };
      }
      return { rows: [] };
    }
    return { rows: mockAristasCounts };
  }

  if (sqlNormalized.includes("correccion")) {
    return { rows: [] };
  }

  return { rows: [] };
};

// Now import the pipeline module after overriding Pool
import { obtenerPipelineAggregated, obtenerPipelineDetalle } from "../../lib/server/pipeline";

test("Pipeline Suite", async (t) => {
  await t.test("1. pipeline completo", async () => {
    mockQueryCount = 0;
    const res = await obtenerPipelineAggregated();
    assert.strictEqual(res.total, 12);
    assert.strictEqual(res.volcados.length, 12);
  });

  await t.test("2. volcado archivado", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-1");
    assert.ok(v);
    assert.strictEqual(v.estado, "archivado");
  });

  await t.test("3. volcado pendiente de revisión", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-2");
    assert.ok(v);
    assert.strictEqual(v.estado, "pendiente_revision");
  });

  await t.test("4. volcado revisado (en_revision)", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-3");
    assert.ok(v);
    assert.strictEqual(v.estado, "en_revision");
  });

  await t.test("5. volcado aprobado", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-4");
    assert.ok(v);
    assert.strictEqual(v.estado, "listo_ingesta");
    assert.strictEqual(v.version_aprobada, 1);
  });

  await t.test("6. volcado ingerido", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-5");
    assert.ok(v);
    assert.strictEqual(v.estado, "ingerido");
    assert.strictEqual(v.ingesta.status, "success");
    assert.strictEqual(v.ingesta.io_id, "io-555");
  });

  await t.test("7. ingesta fallida", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-6");
    assert.ok(v);
    assert.strictEqual(v.estado, "fallido");
    assert.strictEqual(v.ingesta.status, "failed");
    assert.strictEqual(v.ingesta.last_error, "Kernel uncontactable");
  });

  await t.test("8. dictado sin audio", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-7");
    assert.ok(v);
    assert.strictEqual(v.integrity.status, "text_without_audio");
    assert.strictEqual(v.audio_status, "no_recuperable");
  });

  await t.test("9. audio sin texto", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-8");
    assert.ok(v);
    assert.strictEqual(v.integrity.status, "audio_without_text");
  });

  await t.test("10. audio parcial", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-9");
    assert.ok(v);
    assert.strictEqual(v.audio_status, "incompleto");
    assert.strictEqual(v.integrity.status, "audio_partial");
  });

  await t.test("11. versión modificada", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-10");
    assert.ok(v);
    assert.strictEqual(v.integrity.status, "text_edited");
  });

  await t.test("12. provenance roto", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-11");
    assert.ok(v);
    assert.strictEqual(v.integrity.status, "broken_provenance");
  });

  await t.test("13. entrada manual sin audio no genera anomalía", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-12");
    assert.ok(v);
    assert.strictEqual(v.audio_expected, false);
    assert.strictEqual(v.audio_status, "no_aplica");
    assert.strictEqual(v.integrity.status, "sync");
  });

  await t.test("14. io_id correctamente relacionado", async () => {
    const res = await obtenerPipelineAggregated();
    const v = res.volcados.find(x => x.id === "uuid-5");
    assert.ok(v);
    assert.strictEqual(v.ingesta.io_id, "io-555");
  });

  await t.test("15. agregaciones", async () => {
    const res = await obtenerPipelineAggregated();
    assert.strictEqual(res.counts.archivado, 1);
    assert.strictEqual(res.counts.pendiente_revision, 1);
    assert.strictEqual(res.counts.en_revision, 6);
    assert.strictEqual(res.counts.listo_ingesta, 1);
    assert.strictEqual(res.counts.ingerido, 2);
    assert.strictEqual(res.counts.fallido, 1);

    assert.strictEqual(res.integrity.text_without_audio, 1);
    assert.strictEqual(res.integrity.audio_without_text, 1);
    assert.strictEqual(res.integrity.audio_partial, 1);
    assert.strictEqual(res.integrity.text_edited, 1);
    assert.strictEqual(res.integrity.broken_provenance, 1);
  });

  await t.test("16. ausencia de N+1 evidente", async () => {
    mockQueryCount = 0;
    await obtenerPipelineAggregated();
    // For 12 volcados, it performs exactly 6 bulk database queries
    assert.strictEqual(mockQueryCount, 6);
  });

  await t.test("17. idempotencia", async () => {
    const detail1 = await obtenerPipelineDetalle("uuid-5");
    const detail2 = await obtenerPipelineDetalle("uuid-5");
    assert.deepStrictEqual(detail1.procedencia.io_id, detail2.procedencia.io_id);
    assert.deepStrictEqual(detail1.procedencia.graph.entities, detail2.procedencia.graph.entities);
  });
});
