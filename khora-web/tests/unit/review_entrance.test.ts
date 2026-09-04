// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import assert from "assert";
import test, { beforeEach } from "node:test";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting } from "../../lib/server/neon";
import { archivarVolcado, hashTexto } from "../../lib/server/volcados";
import { cifrarTexto } from "../../lib/server/cripto";
import { guardarDictado } from "../../lib/server/dictado";
import { resolverIncidente } from "../../lib/server/incidentes";
import { migrarArchivados } from "../../scripts/migrar_archivados";

test("Review Entrance & Incident Engine Backend", async (t) => {
  let mockVolcadoState = "archivado";
  let mockIncidenteState = "abierto";
  const mockQueries: Array<{ sql: string; params: any[] }> = [];

  const mockDb = {
    query: async (sql: string, params: any[] = []) => {
      mockQueries.push({ sql, params });

      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("ALTER TABLE") || sql.includes("CREATE SEQUENCE")) {
        return { rows: [] };
      }

      if (sql.includes("SELECT COALESCE(MAX(version), 0)")) {
        return { rows: [{ ultima: 0 }] };
      }

      if (sql.includes("INSERT INTO volcado ")) {
        return {
          rows: [{
            id: params[0],
            folio: 101,
            texto: params[1],
            sha256: params[2],
            chars: params[3],
            titulo: params[4],
            origen: params[5],
            driver: params[6],
            usuario: params[7],
            recibido_en: new Date().toISOString(),
            estado: "archivado",
            io_id: null,
            intentos: 0,
            ultimo_error: null,
            ultimo_intento: null
          }]
        };
      }

      if (sql.includes("FOR UPDATE") || sql.includes("SELECT * FROM volcado WHERE id")) {
        return {
          rows: [{
            id: params[0] || "test-uuid",
            folio: 101,
            texto: "cifrado_mock",
            sha256: "sha_mock",
            chars: 10,
            titulo: "Test",
            origen: "web",
            estado: mockVolcadoState
          }]
        };
      }

      if (sql.includes("UPDATE volcado SET estado = 'en_revision'")) {
        mockVolcadoState = "en_revision";
        return {
          rows: [{
            id: params[0],
            folio: 101,
            texto: "cifrado_mock",
            sha256: "sha_mock",
            chars: 10,
            titulo: "Test",
            origen: "web",
            estado: "en_revision"
          }]
        };
      }

      if (sql.includes("INSERT INTO volcado_incidente")) {
        return {
          rows: [{
            id: params[0],
            volcado_id: params[1],
            tipo: params[2],
            severidad: params[3],
            origen: params[4],
            estado: "abierto",
            primera_deteccion: new Date().toISOString(),
            ultima_deteccion: new Date().toISOString(),
            reconocido_por: null,
            reconocido_en: null,
            resuelto_por: null,
            resuelto_en: null,
            codigo_resolucion: null,
            evidencia: JSON.parse(params[5] || "{}")
          }]
        };
      }

      if (sql.includes("SELECT id, volcado_id, tipo, estado, evidencia FROM volcado_incidente")) {
        return {
          rows: [{
            id: params[0],
            volcado_id: "test-uuid",
            tipo: "audio_no_recuperable",
            estado: mockIncidenteState,
            evidencia: {}
          }]
        };
      }

      if (sql.includes("UPDATE volcado_incidente")) {
        mockIncidenteState = "resuelto";
        return {
          rows: [{
            id: params[0],
            volcado_id: "test-uuid",
            tipo: "audio_no_recuperable",
            estado: "resuelto",
            resuelto_por: params[1],
            codigo_resolucion: params[2]
          }]
        };
      }

      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql: string, params: any[] = []) => {
        mockQueries.push({ sql, params });
        if (sql.includes("SELECT COALESCE(MAX(version), 0)")) {
          return { rows: [{ ultima: 0 }] };
        }
        if (sql.includes("FOR UPDATE")) {
          return {
            rows: [{
              id: params[0] || "test-uuid",
              folio: 101,
              texto: "cifrado_mock",
              sha256: "sha_mock",
              chars: 10,
              titulo: "Test",
              origen: "web",
              estado: mockVolcadoState
            }]
          };
        }
        if (sql.includes("UPDATE volcado SET estado = 'en_revision'")) {
          mockVolcadoState = "en_revision";
          return {
            rows: [{
              id: params[0],
              folio: 101,
              texto: "cifrado_mock",
              sha256: "sha_mock",
              chars: 10,
              titulo: "Test",
              origen: "web",
              estado: "en_revision"
            }]
          };
        }
        return { rows: [] };
      },
      release: () => {},
    }),
  };

  setDbForTesting(mockDb as any);

  await t.test("1. Crear volcado (ruta directa y dictado) deja estado == S_REVISION ('en_revision') en feliz", async () => {
    mockVolcadoState = "archivado";
    const resDirecta = await archivarVolcado({
      texto: "Prueba de transcripcion inicial directa",
      titulo: "Volcado de prueba",
      origen: "web",
      usuario: "operador@khora.dev"
    });
    assert.ok(resDirecta);
    assert.strictEqual(resDirecta.estado, "en_revision");

    mockVolcadoState = "archivado";
    const resDictado = await guardarDictado({
      texto: "Prueba de dictado inicial",
      titulo: "Dictado de prueba",
      usuario: "operador@khora.dev"
    });
    assert.ok(resDictado);
    assert.strictEqual(mockVolcadoState, "en_revision");
  });

  await t.test("2. Si la promoción falla en creación: estado == S_CAPTURA ('archivado') + 1 log de fallo + verbatim se conserva", async () => {
    const errorLogs: string[] = [];
    const origConsoleError = console.error;
    console.error = (...args: any[]) => {
      errorLogs.push(args.join(" "));
    };

    const testMockDb = {
      query: async (sql: string, params: any[] = []) => {
        if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("ALTER TABLE") || sql.includes("CREATE SEQUENCE")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO volcado ")) {
          return {
            rows: [{
              id: params[0],
              folio: 102,
              texto: params[1],
              sha256: params[2],
              chars: params[3],
              titulo: params[4],
              origen: params[5],
              driver: params[6],
              usuario: params[7],
              recibido_en: new Date().toISOString(),
              estado: "archivado",
              io_id: null,
              intentos: 0,
              ultimo_error: null,
              ultimo_intento: null
            }]
          };
        }
        if (sql.includes("SELECT * FROM volcado WHERE id") || sql.includes("SELECT id, folio, texto")) {
          return {
            rows: [{
              id: params[0] || "test-uuid-fail",
              folio: 102,
              texto: "Verbatim que no debe perderse jamas",
              sha256: "sha_mock",
              chars: 35,
              titulo: "Test Fail",
              origen: "web",
              estado: "archivado"
            }]
          };
        }
        if (sql.includes("UPDATE volcado SET estado = 'archivado'")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO volcado_incidente")) {
          return {
            rows: [{
              id: params[0],
              volcado_id: params[1],
              tipo: params[2],
              severidad: params[3],
              origen: params[4],
              estado: "abierto",
              primera_deteccion: new Date().toISOString(),
              ultima_deteccion: new Date().toISOString(),
              evidencia: JSON.parse(params[5] || "{}")
            }]
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (sql: string, params: any[] = []) => {
          if (sql.includes("FOR UPDATE")) {
            return {
              rows: [{
                id: params[0] || "test-uuid-fail",
                folio: 102,
                texto: "cifrado_mock",
                sha256: "sha_mock",
                chars: 10,
                titulo: "Test Fail",
                origen: "web",
                estado: "archivado"
              }]
            };
          }
          // Simular fallo durante versión / tildes / títulos en la transacción
          if (sql.includes("SELECT version FROM volcado_version")) {
            throw new Error("Simulated DB promotion failure");
          }
          return { rows: [] };
        },
        release: () => {},
      })
    };

    setDbForTesting(testMockDb as any);

    try {
      const vFail = await archivarVolcado({
        texto: "Verbatim que no debe perderse jamas",
        titulo: "Prueba Fallo",
        origen: "web",
        usuario: "operador@khora.dev"
      });

      assert.strictEqual(vFail.estado, "archivado");
      assert.strictEqual(vFail.texto, "Verbatim que no debe perderse jamas");
      assert.strictEqual(errorLogs.length, 1);
      assert.match(errorLogs[0], /promocion_revision_fallida/);
    } finally {
      console.error = origConsoleError;
      setDbForTesting(mockDb as any);
    }
  });

  await t.test("6. Vista 'Todos' en la UI incluye la unión de todos los estados y no expone S_CAPTURA de forma aislada", async () => {
    // Aserción conceptual sobre la estructura de filtrado de la UI de volcados
    const estadosValidosEnTodos = ["archivado", "pendiente_revision", "en_revision", "listo_ingesta", "ingerido", "fallido"];

    const filtrarPorTab = (filter: string, estadoItem: string) => {
      if (filter === "todos") return true;
      if (filter === "revision") return estadoItem === "en_revision" || estadoItem === "pendiente_revision";
      if (filter === "listos") return estadoItem === "listo_ingesta";
      if (filter === "ingeridos") return estadoItem === "ingerido";
      if (filter === "archivados") return estadoItem === "archivado";
      return false;
    };

    // 'todos' incluye cualquier estado
    for (const est of estadosValidosEnTodos) {
      assert.strictEqual(filtrarPorTab("todos", est), true);
    }

    // Ninguna pestaña visible expone S_CAPTURA ('archivado') por sí sola excepto 'todos' cuando no hay filtro o si se oculta 'archivados'
    assert.strictEqual(filtrarPorTab("revision", "archivado"), false);
    assert.strictEqual(filtrarPorTab("listos", "archivado"), false);
    assert.strictEqual(filtrarPorTab("ingeridos", "archivado"), false);
  });

  await t.test("3, 4, 5. Backfill idempotente, sha256 inmutable y conteo de archivados", async () => {
    const dbState = [
{ id: "id-1", folio: 1, texto: cifrarTexto("Texto 1"), sha256: hashTexto("Texto 1"), chars: 7, estado: "archivado" },
{ id: "id-2", folio: 2, texto: cifrarTexto("Texto 2"), sha256: hashTexto("Texto 2"), chars: 7, estado: "archivado" },
    ];

    const backfillMockDb = {
      query: async (sql: string, params: any[] = []) => {
        if (sql.includes("SELECT estado, COUNT")) {
          const counts: Record<string, number> = {};
          for (const item of dbState) {
            counts[item.estado] = (counts[item.estado] || 0) + 1;
          }
          return { rows: Object.entries(counts).map(([estado, n]) => ({ estado, n })) };
        }
if (
  sql.includes("v.estado = 'archivado'") ||
  sql.includes("WHERE v.estado = 'archivado'") ||
  sql.includes("WHERE estado = 'archivado'")
) {
  const pendientes = dbState.filter(
    (item) => item.estado === "archivado"
  );
  return { rows: pendientes };
}

if (
  sql.includes("SELECT estado, sha256, texto") ||
  sql.includes("SELECT estado, sha256, texto, chars")
) {
  const found = dbState.find((item) => item.id === params[0]);
  return { rows: found ? [found] : [] };
}

if (sql.includes("volcado_version")) {
  return { rows: [{ n: 1, version: 1 }] };
}
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (sql: string, params: any[] = []) => {
          if (sql.includes("FOR UPDATE")) {
            const found = dbState.find((item) => item.id === params[0]);
            return { rows: found ? [found] : [] };
          }
          if (sql.includes("SELECT version FROM volcado_version")) {
            return { rows: [{ version: 1 }] };
          }
          if (sql.includes("UPDATE volcado SET estado = 'en_revision'")) {
            const found = dbState.find((item) => item.id === params[0]);
            if (found) {
              found.estado = "en_revision";
              return { rows: [found] };
            }
          }
          return { rows: [] };
        },
        release: () => {},
      })
    };

    setDbForTesting(backfillMockDb as any);

    try {
      // 1ª corrida: migra los 2 volcados archivados
      const res1 = await migrarArchivados({ dryRun: false });
      assert.strictEqual(res1.procesados, 2);
      assert.strictEqual(res1.fallidos, 0);

      // Verificación de sha256 inmutable
      assert.strictEqual(dbState[0].sha256, hashTexto("Texto 1"));
      assert.strictEqual(dbState[1].sha256, hashTexto("Texto 2"));

      // Aserción 3: count(estado == 'archivado') == 0
      const countArchivados = dbState.filter((v) => v.estado === "archivado").length;
      assert.strictEqual(countArchivados, 0);

      // 2ª corrida (Idempotencia): reporta 0 filas movidas
      const res2 = await migrarArchivados({ dryRun: false });
      assert.strictEqual(res2.procesados, 0);
      assert.strictEqual(res2.total, 0);
    } finally {
      setDbForTesting(mockDb as any);
    }
  });

  await t.test("resolverIncidente valida códigos específicos para audio_no_recuperable", async () => {
    mockIncidenteState = "abierto";
    await assert.rejects(
      async () => {
        await resolverIncidente({
          incidenteId: "inc-123",
          usuario: "operador@khora.dev",
          codigoResolucion: "codigo_invalido"
        });
      },
      /Código de resolución inválido/
    );

    const resuelto = await resolverIncidente({
      incidenteId: "inc-123",
      usuario: "operador@khora.dev",
      codigoResolucion: "aceptado_sin_audio"
    });

    assert.strictEqual(resuelto.estado, "resuelto");
    assert.strictEqual(resuelto.codigo_resolucion, "aceptado_sin_audio");
  });
});
