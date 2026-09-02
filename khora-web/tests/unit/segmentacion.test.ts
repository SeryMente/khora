// @l0 L0-002-R · Pruebas unitarias obligatorias para la segmentación en párrafos re-ejecutable y guardián duro
import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { segmentarEnParrafos, ratificarEstructura, normalizarSinEspacios } from "../../lib/server/pulido";
import { hashTexto } from "../../lib/server/volcados";
import { cifrarTexto, descifrarTexto } from "../../lib/server/cripto";

class MockDb {
  public volcados: Map<string, any> = new Map();
  public versiones: Map<string, any[]> = new Map();
  public eventos: any[] = new Map<string, any[]>() as any;
  public auditEvents: any[] = [];

  constructor() {
    this.eventos = [];
  }

  async connect() {
    return {
      query: async (sql: string, params?: any[]) => this.query(sql, params),
      release: () => {},
    };
  }

  async query(sql: string, params?: any[]) {
    const queryStr = sql.trim().toLowerCase();

    if (queryStr.includes("create table") || queryStr.includes("create index") || queryStr.includes("alter table")) {
      return { rows: [] };
    }

    if (queryStr.includes("select * from volcado where id = $1") || queryStr.includes("select id, texto, sha256, estado")) {
      const id = params?.[0];
      const v = this.volcados.get(id);
      return { rows: v ? [v] : [] };
    }

    if (queryStr.includes("select coalesce(max(version), 1)::int as ultima from volcado_version")) {
      const id = params?.[0];
      const list = this.versiones.get(id) || [];
      const maxVer = list.length > 0 ? Math.max(...list.map((x) => x.version)) : 1;
      return { rows: [{ ultima: maxVer }] };
    }

    if (queryStr.includes("update volcado set texto_estructurado = $2, estructura_ratificada_en = null where id = $1")) {
      const id = params?.[0];
      const prop = params?.[1];
      const v = this.volcados.get(id);
      if (v) {
        v.texto_estructurado = prop;
        v.estructura_ratificada_en = null;
      }
      return { rows: [] };
    }

    if (queryStr.includes("update volcado set estructura_ratificada_en = now() where id = $1")) {
      const id = params?.[0];
      const v = this.volcados.get(id);
      const nowIso = new Date().toISOString();
      if (v) {
        v.estructura_ratificada_en = nowIso;
      }
      return { rows: [{ estructura_ratificada_en: nowIso }] };
    }

    if (queryStr.includes("insert into eventos_sistema")) {
      const eventHash = params?.[11] || "mockhash";
      this.auditEvents.push({
        fase: params?.[0],
        event_id: params?.[1],
        estado: params?.[2],
        mensaje: params?.[3],
        detalle: params?.[4],
        volcado_id: params?.[5],
        version: params?.[6],
        sha256: params?.[7],
        correlacion_id: params?.[8],
        event_hash: eventHash,
      });
      return { rows: [] };
    }

    if (queryStr.includes("select event_hash from eventos_sistema")) {
      const last = this.auditEvents[this.auditEvents.length - 1];
      return { rows: last ? [{ event_hash: last.event_hash }] : [] };
    }

    return { rows: [] };
  }
}

describe("Segmentación en Párrafos Re-ejecutable y Guardián Duro", () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = new MockDb();
    setDbForTesting(mockDb as any);
  });

  afterEach(() => {
    resetDbForTesting();
  });

  // ASERCIÓN 1: Camino feliz
  test("1. Camino feliz: normalizar(verbatim) === normalizar(propuesta) (igualdad EXACTA de caracteres no-blancos)", async () => {
    const id = "volcado-1";
    const verbatim = "Primer párrafo de prueba. Segundo párrafo de prueba.";
    const sha = hashTexto(verbatim);

    mockDb.volcados.set(id, {
      id,
      texto: cifrarTexto(verbatim),
      sha256: sha,
      estado: "en_revision",
    });

    const mockLLM = async (txt: string) => "Primer párrafo de prueba.\n\nSegundo párrafo de prueba.";

    const res = await segmentarEnParrafos(id, { mockLLM, actor: "test@khora.org" });

    assert.equal(res.volcado_id, id);
    assert.equal(res.texto_estructurado, "Primer párrafo de prueba.\n\nSegundo párrafo de prueba.");

    const volcadoDb = mockDb.volcados.get(id);
    assert.equal(volcadoDb.texto_estructurado, "Primer párrafo de prueba.\n\nSegundo párrafo de prueba.");
    assert.equal(normalizarSinEspacios(verbatim), normalizarSinEspacios(res.texto_estructurado));
  });

  // ASERCIÓN 2: sha256 inmutable
  test("2. sha256(verbatim) idéntico antes y después de generar y ratificar", async () => {
    const id = "volcado-2";
    const verbatim = "Texto inmutable para la prueba de sha256 con múltiples palabras.";
    const shaInicial = hashTexto(verbatim);

    mockDb.volcados.set(id, {
      id,
      texto: cifrarTexto(verbatim),
      sha256: shaInicial,
      estado: "en_revision",
    });

    const mockLLM = async (txt: string) => "Texto inmutable para la prueba\n\nde sha256 con múltiples palabras.";

    // Segmentar
    await segmentarEnParrafos(id, { mockLLM });
    const volcadoTrasSegmentar = mockDb.volcados.get(id);
    const shaTrasSegmentar = hashTexto(descifrarTexto(volcadoTrasSegmentar.texto));
    assert.equal(volcadoTrasSegmentar.sha256, shaInicial);
    assert.equal(shaTrasSegmentar, shaInicial);

    // Ratificar
    await ratificarEstructura(id);
    const volcadoTrasRatificar = mockDb.volcados.get(id);
    const shaTrasRatificar = hashTexto(descifrarTexto(volcadoTrasRatificar.texto));
    assert.equal(volcadoTrasRatificar.sha256, shaInicial);
    assert.equal(shaTrasRatificar, shaInicial);
  });

  // ASERCIÓN 3: Segunda ejecución
  test("3. Segunda ejecución: solo cambia el campo de propuesta; verbatim y sha256 intactos", async () => {
    const id = "volcado-3";
    const verbatim = "Uno dos tres cuatro cinco seis siete ocho nueve diez.";
    const shaInicial = hashTexto(verbatim);

    mockDb.volcados.set(id, {
      id,
      texto: cifrarTexto(verbatim),
      sha256: shaInicial,
      estado: "en_revision",
    });

    // Primera ejecución
    await segmentarEnParrafos(id, {
      mockLLM: async () => "Uno dos tres cuatro cinco.\n\nseis siete ocho nueve diez.",
    });
    const v1 = mockDb.volcados.get(id).texto_estructurado;

    // Segunda ejecución con diferente formato de párrafos
    await segmentarEnParrafos(id, {
      mockLLM: async () => "Uno dos.\n\ntres cuatro cinco.\n\nseis siete ocho.\n\nnueve diez.",
    });
    const v2 = mockDb.volcados.get(id).texto_estructurado;

    assert.notEqual(v1, v2);
    assert.equal(descifrarTexto(mockDb.volcados.get(id).texto), verbatim);
    assert.equal(mockDb.volcados.get(id).sha256, shaInicial);
  });

  // ASERCIÓN 4: Guardián duro rechaza y emite exactamente 1 evento FAIL
  test("4. Guardián duro: con output mutado (palabra cambiada/borrada), RECHAZA, no persiste y emite exactamente 1 evento FAIL", async () => {
    const id = "volcado-4";
    const verbatim = "El rápido zorro marrón salta sobre el perro perezoso.";
    const shaInicial = hashTexto(verbatim);

    mockDb.volcados.set(id, {
      id,
      texto: cifrarTexto(verbatim),
      sha256: shaInicial,
      estado: "en_revision",
      texto_estructurado: null,
    });

    // Output con palabra alterada ("zorro" -> "gato")
    const mockLLMMutado = async () => "El rápido gato marrón salta sobre el perro perezoso.";

    await assert.rejects(
      async () => {
        await segmentarEnParrafos(id, { mockLLM: mockLLMMutado });
      },
      (err: any) => {
        return err.message.includes("Guardián duro violado");
      }
    );

    // No persiste nada
    assert.equal(mockDb.volcados.get(id).texto_estructurado, null);

    // Emite exactamente 1 evento FAIL
    const failEvents = mockDb.auditEvents.filter((e) => e.event_id === "REV-002" && e.estado === "FAIL");
    assert.equal(failEvents.length, 1);
  });

  // ASERCIÓN 5: Ratificación
  test("5. Ratificación: hasta no ratificar, texto oficial no cambia; tras ratificar, fija timestamp de ratificación", async () => {
    const id = "volcado-5";
    const verbatim = "Módulo de prueba para verificar ratificación explicita de estructura.";
    const shaInicial = hashTexto(verbatim);

    mockDb.volcados.set(id, {
      id,
      texto: cifrarTexto(verbatim),
      sha256: shaInicial,
      estado: "en_revision",
      texto_estructurado: null,
      estructura_ratificada_en: null,
    });

    // Segmentar
    await segmentarEnParrafos(id, {
      mockLLM: async () => "Módulo de prueba para verificar\n\nratificación explicita de estructura.",
    });

    let vDb = mockDb.volcados.get(id);
    assert.equal(vDb.estructura_ratificada_en, null);
    assert.equal(vDb.estado, "en_revision");
    assert.equal(descifrarTexto(vDb.texto), verbatim);

    // Ratificar
    await ratificarEstructura(id, { actor: "operador@khora.org" });

    vDb = mockDb.volcados.get(id);
    assert.notEqual(vDb.estructura_ratificada_en, null);
    assert.equal(vDb.estado, "en_revision"); // El estado general del volcado NO cambia a listo_ingesta
    assert.equal(descifrarTexto(vDb.texto), verbatim); // El verbatim se mantiene idéntico

    const okEvents = mockDb.auditEvents.filter((e) => e.event_id === "REV-003" && e.estado === "OK");
    assert.equal(okEvents.length, 1);
  });
});
