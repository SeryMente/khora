// @l0 L0-002-R · @req PROMPT-3A/PROPUESTAS
import "./setup";
import { test, describe } from "node:test";
import assert from "node:assert";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import {
  construirTerna,
  calcularSelloPropuesta,
  validarSpanExacto,
  haySolapamiento,
  obtenerSolapados,
  generarPropuestasReglas,
  generarPropuestasLLM,
  generarYPersistirPropuestas,
  aplicarPropuestasCorreccion,
  actualizarEstadoPropuesta,
} from "../../lib/server/propuestasCorreccion";
import { cifrarTexto } from "../../lib/server/cripto";

describe("Motor de Corrección Nivel Word bajo Guardián — PROMPT 3A Suite", () => {
  test("1. Construcción determinista de Terna y Sello SHA-256", () => {
    const volcadoId = "volcado-123";
    const version = 1;
    const sha256 = "a".repeat(64);

    const terna = construirTerna(volcadoId, version, sha256);
    assert.strictEqual(terna, "(volcado-123,1,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)");

    const sello1 = calcularSelloPropuesta({
      terna,
      start: 0,
      end: 6,
      texto_original_exacto: "codigo",
      reemplazo: "código",
      categoria: "tildes",
      regla: "Tilde ortográfica inequívoca",
    });

    const sello2 = calcularSelloPropuesta({
      terna,
      start: 0,
      end: 6,
      texto_original_exacto: "codigo",
      reemplazo: "código",
      categoria: "tildes",
      regla: "Tilde ortográfica inequívoca",
    });

    assert.strictEqual(sello1.length, 64);
    assert.strictEqual(sello1, sello2);

    // Variación en payload altera el sello
    const selloAlterado = calcularSelloPropuesta({
      terna,
      start: 0,
      end: 6,
      texto_original_exacto: "codigo",
      reemplazo: "códigos",
      categoria: "tildes",
      regla: "Tilde ortográfica inequívoca",
    });
    assert.notStrictEqual(sello1, selloAlterado);
  });

  test("2. Offsets Unicode, emojis, acentos y combining marks con slice exacto JS UTF-16", () => {
    const textoCompleto = "En la sección 🚀 de Dąbrowski, el codigo tambien es importante.";
    const terna = "(v1,1,sha)";

    // Validar exactitud del span
    const startSec = textoCompleto.indexOf("sección");
    const endSec = startSec + "sección".length;
    assert.ok(validarSpanExacto(textoCompleto, startSec, endSec, "sección"));

    const startCod = textoCompleto.indexOf("codigo");
    const endCod = startCod + "codigo".length;
    assert.ok(validarSpanExacto(textoCompleto, startCod, endCod, "codigo"));

    // Intentar modificar fuera del span o con string incorrecto
    assert.strictEqual(validarSpanExacto(textoCompleto, startCod, endCod + 1, "codigo"), false);
    assert.strictEqual(validarSpanExacto(textoCompleto, startCod, endCod, "codigox"), false);

    // Reglas sobre texto con emoji y caracteres multibyte
    const propuestas = generarPropuestasReglas(textoCompleto, terna);
    const pCodigo = propuestas.find((p) => p.texto_original_exacto === "codigo");
    assert.ok(pCodigo);
    assert.strictEqual(pCodigo.reemplazo, "código");
    assert.strictEqual(
      textoCompleto.slice(pCodigo.start, pCodigo.end),
      pCodigo.texto_original_exacto
    );
  });

  test("3. Respuesta LLM malformada o vacía es tolerada de forma segura", async () => {
    const terna = "(v1,1,sha)";
    // Sin GROQ_API_KEY o con entrada vacía, retorna array vacío sin arrojar excepción
    const resultadoSinKey = await generarPropuestasLLM("Texto de prueba", terna);
    assert.deepStrictEqual(resultadoSinKey, []);

    const resultadoVacio = await generarPropuestasLLM("", terna);
    assert.deepStrictEqual(resultadoVacio, []);
  });

  test("4. Detección de solapamientos y cálculo de ítems en conflicto", () => {
    const p1 = { id: "p1", start: 0, end: 10 };
    const p2 = { id: "p2", start: 8, end: 15 }; // Solapa con p1
    const p3 = { id: "p3", start: 20, end: 30 }; // No solapa

    assert.strictEqual(haySolapamiento([p1, p3]), false);
    assert.strictEqual(haySolapamiento([p1, p2, p3]), true);

    const solapados = obtenerSolapados([p1, p2, p3]);
    assert.strictEqual(solapados.size, 2);
    assert.ok(solapados.has("p1"));
    assert.ok(solapados.has("p2"));
    assert.ok(!solapados.has("p3"));
  });

  test("5. Intento de aplicar con SHA vencido o versión obsoleta es rechazado", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000001";
    const shaActivo = "b".repeat(64);
    const shaObsoleto = "a".repeat(64);

    const dbStore: Record<string, any[]> = {
      volcado: [
        {
          id: volcadoId,
          texto: cifrarTexto("El codigo no cambio."),
          sha256: shaActivo,
          estado: "en_revision",
        },
      ],
      volcado_version: [{ ultima: 2 }],
      volcado_propuesta_correccion: [
        {
          id: "p-obs-1",
          volcado_id: volcadoId,
          version: 1, // Versión obsoleta (actual es 2)
          sha256: shaObsoleto, // SHA no coincide con shaActivo
          terna: `(${volcadoId},1,${shaObsoleto})`,
          start_pos: 3,
          end_pos: 9,
          texto_original_exacto: "codigo",
          reemplazo: "código",
          categoria: "tildes",
          regla: "Tilde ortográfica",
          explicacion: "Acentuar codigo",
          confianza: 0.99,
          proveedor: "khora_rules",
          modelo: "v1",
          sello: "sello-123",
          estado: "pendiente",
        },
      ],
    };

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado WHERE id")) {
          return { rows: dbStore.volcado };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: dbStore.volcado_version };
        }
        if (sql.includes("FROM volcado_propuesta_correccion")) {
          return { rows: dbStore.volcado_propuesta_correccion };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const res = await aplicarPropuestasCorreccion(volcadoId, ["p-obs-1"]);
      assert.strictEqual(res.exito, false);
      assert.ok(res.motivo?.includes("SHA o versión vencida"));
    } finally {
      resetDbForTesting();
    }
  });

  test("6. Intento de aplicar lote con solapamiento rechaza el lote y marca ítems como pendiente_revision", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000002";
    const shaActivo = "c".repeat(64);
    const textoFuente = "Texto con dos propuestas solapadas aquí.";

    const dbStore: Record<string, any[]> = {
      volcado: [
        {
          id: volcadoId,
          texto: cifrarTexto(textoFuente),
          sha256: shaActivo,
          estado: "en_revision",
        },
      ],
      volcado_version: [{ ultima: 1 }],
      volcado_propuesta_correccion: [
        {
          id: "p-sol-1",
          volcado_id: volcadoId,
          version: 1,
          sha256: shaActivo,
          terna: `(${volcadoId},1,${shaActivo})`,
          start_pos: 10,
          end_pos: 20,
          texto_original_exacto: textoFuente.slice(10, 20),
          reemplazo: "reemplazoA",
          categoria: "llm_patch",
          regla: "Regla A",
          explicacion: "Explicacion A",
          confianza: 0.9,
          proveedor: "groq",
          modelo: "v1",
          sello: "selloA",
          estado: "pendiente",
        },
        {
          id: "p-sol-2",
          volcado_id: volcadoId,
          version: 1,
          sha256: shaActivo,
          terna: `(${volcadoId},1,${shaActivo})`,
          start_pos: 15,
          end_pos: 25, // Solapa con p-sol-1 (10..20 vs 15..25)
          texto_original_exacto: textoFuente.slice(15, 25),
          reemplazo: "reemplazoB",
          categoria: "llm_patch",
          regla: "Regla B",
          explicacion: "Explicacion B",
          confianza: 0.9,
          proveedor: "groq",
          modelo: "v1",
          sello: "selloB",
          estado: "pendiente",
        },
      ],
      updates: [],
    };

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("UPDATE volcado_propuesta_correccion SET estado = 'pendiente_revision'")) {
          dbStore.updates.push({ sql, params });
          return { rows: [] };
        }
        if (sql.includes("FROM volcado WHERE id")) {
          return { rows: dbStore.volcado };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: dbStore.volcado_version };
        }
        if (sql.includes("FROM volcado_propuesta_correccion")) {
          return { rows: dbStore.volcado_propuesta_correccion };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const res = await aplicarPropuestasCorreccion(volcadoId, ["p-sol-1", "p-sol-2"]);
      assert.strictEqual(res.exito, false);
      assert.ok(res.motivo?.includes("Solapamiento detectado"));
      assert.ok(dbStore.updates.length > 0);
    } finally {
      resetDbForTesting();
    }
  });

  test("7. Aceptación exitosa de lote no solapado crea NUEVA volcado_version e inmutabilidad fuente", async () => {
    const volcadoId = "00000000-0000-0000-0000-000000000003";
    const shav1 = "d".repeat(64);
    const textoOriginal = "El codigo tambien tiene una seccion valida.";

    const versionesGuardadas: any[] = [];
    const volcadoUpdates: any[] = [];
    const propuestasUpdates: any[] = [];

    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("INSERT INTO volcado_version")) {
          versionesGuardadas.push({ sql, params });
          return { rows: [] };
        }
        if (sql.includes("UPDATE volcado SET")) {
          volcadoUpdates.push({ sql, params });
          return { rows: [] };
        }
        if (sql.includes("UPDATE volcado_propuesta_correccion SET estado = 'aceptada'")) {
          propuestasUpdates.push({ sql, params });
          return { rows: [] };
        }
        if (sql.includes("FROM volcado WHERE id")) {
          return {
            rows: [
              {
                id: volcadoId,
                texto: cifrarTexto(textoOriginal),
                sha256: shav1,
                estado: "en_revision",
              },
            ],
          };
        }
        if (sql.includes("MAX(version)")) {
          return { rows: [{ ultima: 1 }] };
        }
        if (sql.includes("FROM volcado_propuesta_correccion")) {
          return {
            rows: [
              {
                id: "p-ok-1",
                volcado_id: volcadoId,
                version: 1,
                sha256: shav1,
                terna: `(${volcadoId},1,${shav1})`,
                start_pos: 3,
                end_pos: 9,
                texto_original_exacto: "codigo",
                reemplazo: "código",
                categoria: "tildes",
                regla: "Tilde ortográfica",
                explicacion: "Acentuar codigo",
                confianza: 0.99,
                proveedor: "khora_rules",
                modelo: "v1",
                sello: "sello-ok-1",
                estado: "pendiente",
              },
              {
                id: "p-ok-2",
                volcado_id: volcadoId,
                version: 1,
                sha256: shav1,
                terna: `(${volcadoId},1,${shav1})`,
                start_pos: 10,
                end_pos: 17,
                texto_original_exacto: "tambien",
                reemplazo: "también",
                categoria: "tildes",
                regla: "Tilde ortográfica",
                explicacion: "Acentuar tambien",
                confianza: 0.99,
                proveedor: "khora_rules",
                modelo: "v1",
                sello: "sello-ok-2",
                estado: "pendiente",
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    setDbForTesting(mockDb as any);
    try {
      const res = await aplicarPropuestasCorreccion(volcadoId, ["p-ok-1", "p-ok-2"], {
        actor: "operador@khora.dev",
      });

      assert.strictEqual(res.exito, true);
      assert.strictEqual(res.nuevaVersion, 2);
      assert.strictEqual(res.propuestasAplicadas, 2);
      assert.ok(typeof res.nuevoSha256 === "string" && res.nuevoSha256.length === 64);

      // Confirmar que se creó una NUEVA versión 2
      assert.strictEqual(versionesGuardadas.length, 1);
      assert.strictEqual(versionesGuardadas[0].params[2], 2); // version = 2

      // Confirmar que se actualizaron las propuestas como 'aceptadas'
      assert.strictEqual(propuestasUpdates.length, 1);
    } finally {
      resetDbForTesting();
    }
  });
});
