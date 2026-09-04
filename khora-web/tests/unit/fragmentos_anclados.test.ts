// @l0 L0-002-R · @req PROMPT-8/FRAGMENTOS_ANCLADOS_TESTS
import "./setup";
import { test, describe } from "node:test";
import assert from "node:assert";
import { createHash } from "crypto";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import {
  calcularFragmentId,
  calcularSelloRun,
  segmentarTextoContiguo,
  generarFragmentosAnclados,
  obtenerFragmentoPorId,
  listarFragmentosPorVersion,
  FragmentoAnclado,
} from "../../lib/server/fragmentos";
import { construirTerna } from "../../lib/server/propuestasCorreccion";
import { cifrarTexto } from "../../lib/server/cripto";
import { computeItemId, KHORA_PROPOSAL_NAMESPACE } from "../../lib/contracts/proposal";

describe("PROMPT 8 — Fragmentos Literales Anclados (Arranque IAR) Suite", () => {
  test("1. Cálculo determinista de ID (UUIDv5) e Idempotencia conforme al contrato 5-0", () => {
    const volcadoId = "00000000-0000-0000-0000-000000000001";
    const version = 1;
    const sha256 = "a".repeat(64);
    const cita = "Texto de fragmento literal de prueba.";
    const start = 0;
    const end = cita.length;

    const id1 = calcularFragmentId(volcadoId, version, sha256, start, end, cita);
    const id2 = calcularFragmentId(volcadoId, version, sha256, start, end, cita);

    // Mismo input -> Mismo id (idempotencia)
    assert.strictEqual(id1, id2);
    assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Verificación explícita de coincidencia con computeItemId del contrato 5-0
    const hashFrag = createHash("sha256").update(cita, "utf8").digest("hex").toLowerCase();
    const expectedId = computeItemId(
      { volcado_id: volcadoId, version, sha256 },
      `${start}:${end}:${hashFrag}`
    );
    assert.strictEqual(id1, expectedId);

    // Cambio en cita o span altera el UUIDv5
    const idDiferente = calcularFragmentId(volcadoId, version, sha256, start, end + 1, cita + ".");
    assert.notStrictEqual(id1, idDiferente);
  });

  test("2. Offsets Unicode UTF-16, emojis, acentos y combining marks", () => {
    const textoMultibyte = "Sección 🚀 de Dąbrowski.\n\nContenido adicional con acentuación: canción, café y niño.";

    const spans = segmentarTextoContiguo(textoMultibyte);
    assert.ok(spans.length >= 2);

    // Verificación estricta de slice UTF-16
    let pos = 0;
    for (const s of spans) {
      assert.strictEqual(s.start, pos);
      const sliceReal = textoMultibyte.slice(s.start, s.end);
      assert.strictEqual(sliceReal, s.cita);
      pos = s.end;
    }
    assert.strictEqual(pos, textoMultibyte.length);

    // Reconstrucción 100% byte a byte
    const textoReconstruido = spans.map((s) => s.cita).join("");
    assert.strictEqual(textoReconstruido, textoMultibyte);
  });

  test("3. Cobertura 100% contigua, cero huecos y cero solapes no declarados", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000002";
    const sha256 = "b".repeat(64);
    const textoOriginal = "Primer párrafo de prueba.\n\nSegundo párrafo de prueba con datos.\n\nTercer párrafo final.";

    const dbRows: any[] = [];

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: volcadoId,
                texto: cifrarTexto(textoOriginal),
                sha256,
                estado: "en_revision",
                texto_estructurado: null,
              },
            ],
          };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: [{ ultima: 1 }] };
        }
        if (sql.includes("FROM volcado_version")) {
          return {
            rows: [
              {
                texto: cifrarTexto(textoOriginal),
                sha256,
              },
            ],
          };
        }
        if (sql.includes("INSERT INTO volcado_fragmento_anclado")) {
          const r = {
            id: params[0],
            volcado_id: params[1],
            version: params[2],
            sha256: params[3],
            terna: params[4],
            start_pos: params[5],
            end_pos: params[6],
            cita_exacta: params[7],
            hash_fragmento: params[8],
            sello: params[9],
            created_at: new Date().toISOString(),
          };
          dbRows.push(r);
          return { rows: [r] };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const res = await generarFragmentosAnclados(volcadoId, 1, { mockRunTimestamp: "2026-01-01T00:00:00.000Z" });

      assert.ok(res.sello);
      assert.strictEqual(res.total_fragmentos, 3);
      assert.strictEqual(res.fragmentos.length, 3);

      // Verificación de política 100%: sin huecos, sin solapes, contigüidad absoluta
      let p = 0;
      for (let i = 0; i < res.fragmentos.length; i++) {
        const f = res.fragmentos[i];
        assert.strictEqual(f.start_pos, p, `Gap o overlap detectado en fragmento ${i}`);
        assert.strictEqual(textoOriginal.slice(f.start_pos, f.end_pos), f.cita_exacta);
        p = f.end_pos;
      }
      assert.strictEqual(p, textoOriginal.length);

      // Reconstrucción concatenada idéntica al texto original
      const concatenado = res.fragmentos.map((f) => f.cita_exacta).join("");
      assert.strictEqual(concatenado, textoOriginal);
    } finally {
      resetDbForTesting();
    }
  });

  test("4. Inmutabilidad por corrida y persistencia append-only con nuevo sello", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000003";
    const sha256 = "c".repeat(64);
    const textoOriginal = "Párrafo único de test.";

    const dbStore: FragmentoAnclado[] = [];

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: volcadoId,
                texto: cifrarTexto(textoOriginal),
                sha256,
                estado: "en_revision",
                texto_estructurado: null,
              },
            ],
          };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: [{ ultima: 1 }] };
        }
        if (sql.includes("FROM volcado_version")) {
          return {
            rows: [{ texto: cifrarTexto(textoOriginal), sha256 }],
          };
        }
        if (sql.includes("INSERT INTO volcado_fragmento_anclado")) {
          const r: FragmentoAnclado = {
            id: params[0],
            volcado_id: params[1],
            version: params[2],
            sha256: params[3],
            terna: params[4],
            start_pos: params[5],
            end_pos: params[6],
            cita_exacta: params[7],
            hash_fragmento: params[8],
            sello: params[9],
            created_at: new Date().toISOString(),
          };
          dbStore.push(r);
          return { rows: [r] };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      // Run 1
      const res1 = await generarFragmentosAnclados(volcadoId, 1, {
        mockRunTimestamp: "2026-01-01T10:00:00.000Z",
      });

      // Run 2 (Regeneración con nuevo timestamp -> nuevo sello)
      const res2 = await generarFragmentosAnclados(volcadoId, 1, {
        mockRunTimestamp: "2026-01-01T11:00:00.000Z",
      });

      assert.notStrictEqual(res1.sello, res2.sello);
      // Los fragmentos de la primera corrida no fueron borrados (append-only)
      assert.strictEqual(dbStore.length, 2);
      assert.strictEqual(dbStore[0].sello, res1.sello);
      assert.strictEqual(dbStore[1].sello, res2.sello);
    } finally {
      resetDbForTesting();
    }
  });

  test("5. Manejo de versión obsoleta", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000004";
    const sha1 = "1".repeat(64);
    const sha2 = "2".repeat(64);
    const textoV1 = "Texto de versión 1 obsoleta.";
    const textoV2 = "Texto de versión 2 activa.";

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: volcadoId,
                texto: cifrarTexto(textoV2),
                sha256: sha2,
                estado: "en_revision",
                texto_estructurado: null,
              },
            ],
          };
        }
        if (sql.includes("FROM volcado_version WHERE volcado_id = $1 AND version = $2")) {
          if (params[1] === 1) {
            return { rows: [{ version: 1, texto: cifrarTexto(textoV1), sha256: sha1 }] };
          }
          if (params[1] === 2) {
            return { rows: [{ version: 2, texto: cifrarTexto(textoV2), sha256: sha2 }] };
          }
        }
        if (sql.includes("INSERT INTO volcado_fragmento_anclado")) {
          return {
            rows: [
              {
                id: params[0],
                volcado_id: params[1],
                version: params[2],
                sha256: params[3],
                terna: params[4],
                start_pos: params[5],
                end_pos: params[6],
                cita_exacta: params[7],
                hash_fragmento: params[8],
                sello: params[9],
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const resV1 = await generarFragmentosAnclados(volcadoId, 1);
      assert.strictEqual(resV1.source_triplet.version, 1);
      assert.strictEqual(resV1.source_triplet.sha256, sha1);
      assert.strictEqual(resV1.fragmentos[0].cita_exacta, textoV1);

      // Solicitar versión inexistente arroja error
      await assert.rejects(
        async () => {
          await generarFragmentosAnclados(volcadoId, 99);
        },
        /Versión 99 no encontrada/
      );
    } finally {
      resetDbForTesting();
    }
  });

  test("6. Trazabilidad Inversa (fragment_id -> cita -> terna -> volcado)", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000005";
    const version = 1;
    const sha256 = "e".repeat(64);
    const cita = "Cita exacta para trazabilidad inversa.";
    const hashFrag = createHash("sha256").update(cita, "utf8").digest("hex").toLowerCase();
    const fragId = calcularFragmentId(volcadoId, version, sha256, 0, cita.length, cita);
    const sello = "sello-trazabilidad";

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado_fragmento_anclado f")) {
          if (params[0] === fragId) {
            return {
              rows: [
                {
                  id: fragId,
                  volcado_id: volcadoId,
                  version,
                  sha256,
                  terna: `(${volcadoId},${version},${sha256})`,
                  start_pos: 0,
                  end_pos: cita.length,
                  cita_exacta: cita,
                  hash_fragmento: hashFrag,
                  sello,
                  created_at: new Date().toISOString(),
                  titulo: "Volcado de Trazabilidad",
                  origen: "web",
                  estado: "en_revision",
                },
              ],
            };
          }
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const detalle = await obtenerFragmentoPorId(fragId);
      assert.ok(detalle);
      assert.strictEqual(detalle.fragment_id, fragId);
      assert.strictEqual(detalle.cita, cita);
      assert.strictEqual(detalle.terna.volcado_id, volcadoId);
      assert.strictEqual(detalle.terna.version, 1);
      assert.strictEqual(detalle.terna.sha256, sha256);
      assert.strictEqual(detalle.volcado.titulo, "Volcado de Trazabilidad");
      assert.strictEqual(detalle.volcado.estado, "en_revision");

      // ID inexistente retorna null
      const inexistent = await obtenerFragmentoPorId("00000000-0000-0000-0000-000000000099");
      assert.strictEqual(inexistent, null);
    } finally {
      resetDbForTesting();
    }
  });

  test("7. Manejo seguro de texto vacío", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000006";
    const sha256 = "f".repeat(64);

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: volcadoId,
                texto: cifrarTexto(""),
                sha256,
                estado: "en_revision",
                texto_estructurado: null,
              },
            ],
          };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: [{ ultima: 1 }] };
        }
        if (sql.includes("FROM volcado_version")) {
          return { rows: [{ version: 1, texto: cifrarTexto(""), sha256 }] };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const res = await generarFragmentosAnclados(volcadoId, 1);
      assert.strictEqual(res.total_fragmentos, 0);
      assert.deepStrictEqual(res.fragmentos, []);
      assert.ok(res.sello);
    } finally {
      resetDbForTesting();
    }
  });
});
