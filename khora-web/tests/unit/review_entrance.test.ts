// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import assert from "assert";
import test, { beforeEach } from "node:test";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting } from "../../lib/server/neon";
import { archivarVolcado } from "../../lib/server/volcados";
import { resolverIncidente } from "../../lib/server/incidentes";

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

  await t.test("archivarVolcado entra automáticamente a en_revision de forma idempotente", async () => {
    mockVolcadoState = "archivado";
    const res = await archivarVolcado({
      texto: "Prueba de transcripcion inicial",
      titulo: "Volcado de prueba",
      origen: "web",
      usuario: "operador@khora.dev"
    });

    assert.ok(res);
    assert.strictEqual(res.estado, "en_revision");
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
