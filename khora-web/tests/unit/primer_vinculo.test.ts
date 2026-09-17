// @l0 L0-002 · @req HARNESS-01/REQ-1 · Unit Tests para Primer Vínculo Harness
import "./setup";
import assert from "assert";
import test from "node:test";
import neo4j from "neo4j-driver";
import { Pool } from "pg";
import { randomUUID } from "crypto";

process.env.AUTH_SECRET = "mock-secret-12345678901234567890";
process.env.DATABASE_URL = "postgres://localhost:5432/mockdb";
process.env.X_KHORA_KEY = "test-khora-key-12345678901234567890";
process.env.KHORA_API_URL = "http://127.0.0.1:8000";

let fetchMockResponse: () => Promise<any> = async () => ({
  status: 200,
  ok: true,
  json: async () => ({
    io_id: "io-test-uuid-1234",
    idempotent: false,
    counters: { create: 3, update: 1, ignore: 0 },
    ts: "2026-09-17T12:00:00Z",
  }),
});

globalThis.fetch = (async (url: any, options: any) => {
  return fetchMockResponse();
}) as any;

let mockDbVolcados: any[] = [];
let mockDbVersions: any[] = [];
let dbQueriesLogged: { sql: string; params?: any[] }[] = [];

Pool.prototype.query = (async function (sql: string, params?: any[]) {
  dbQueriesLogged.push({ sql, params });
  const sqlNormalized = sql.trim().toLowerCase();

  if (sqlNormalized.includes("select") && sqlNormalized.includes("volcado") && !sqlNormalized.includes("volcado_version")) {
    const idParam = params ? params[0] : null;
    const found = mockDbVolcados.find((v) => v.id === idParam);
    return { rows: found ? [found] : [] };
  }

  if (sqlNormalized.includes("select") && sqlNormalized.includes("volcado_version")) {
    const idParam = params ? params[0] : null;
    const found = mockDbVersions.filter((v) => v.volcado_id === idParam);
    return { rows: found };
  }

  return { rows: [] };
}) as any;

import { ejecutarPrimerVinculo } from "../../scripts/primer_vinculo";
import { sha256de } from "../../lib/server/correcciones";
import { cifrarTexto } from "../../lib/server/cripto";

test("Primer Vínculo Harness Suite", async (t) => {
  const volcadoId = randomUUID();
  const textoPrueba = "Contenido de prueba para el primer vínculo real.";
  const sha = sha256de(textoPrueba);

  const originalDriver = neo4j.driver;
  (neo4j as any).driver = () => ({
    session: () => ({
      run: async (query: string, params: any) => {
        if (query.includes("RETURN io.volcado_id AS volcado_id")) {
          return {
            records: [
              {
                get: (key: string) => {
                  if (key === "volcado_id") return volcadoId;
                  if (key === "version") return 1;
                  if (key === "sha256") return sha;
                  return null;
                },
              },
            ],
          };
        }
        if (query.includes("count(e) AS node_count")) {
          return {
            records: [{ get: () => 4 }],
          };
        }
        if (query.includes("count(r) AS relation_count")) {
          return {
            records: [{ get: () => 2 }],
          };
        }
        return { records: [] };
      },
      close: async () => {},
    }),
    close: async () => {},
  });

  const origUri = process.env.NEO4J_URI;
  const origUser = process.env.NEO4J_USER;
  const origPass = process.env.NEO4J_PASSWORD;

  process.env.NEO4J_URI = "bolt://localhost:7687";
  process.env.NEO4J_USER = "neo4j";
  process.env.NEO4J_PASSWORD = "password";

  try {
    mockDbVolcados = [
      {
        id: volcadoId,
        estado: "listo_ingesta",
        version_aprobada: 1,
        sha256_aprobado: sha,
        io_id: null,
      },
    ];

    mockDbVersions = [
      {
        volcado_id: volcadoId,
        version: 1,
        texto: cifrarTexto(textoPrueba),
        sha256: sha,
        chars: textoPrueba.length,
        motivo: "Aprobado",
      },
    ];

    await t.test("1. Ejecución Exitosa: Volcado listo_ingesta aterriza en Neo4j y se verifica de forma independiente", async () => {
      dbQueriesLogged = [];
      fetchMockResponse = async () => ({
        status: 200,
        ok: true,
        json: async () => ({
          io_id: `io-${volcadoId}`,
          idempotent: false,
          counters: { create: 4, update: 0, ignore: 0 },
          ts: new Date().toISOString(),
        }),
      });

      const reporte = await ejecutarPrimerVinculo({ volcadoId, dryRun: false });

      assert.strictEqual(reporte.ok, true);
      assert.strictEqual(reporte.volcado_id, volcadoId);
      assert.strictEqual(reporte.version, 1);
      assert.strictEqual(reporte.sha256, sha);
      assert.strictEqual(reporte.io_id, `io-${volcadoId}`);
      assert.strictEqual(reporte.metodo_ingesta, "kernel_directo (/api/v1/ingesta)");
      assert.strictEqual(reporte.estado_volcado, "ingerido");
      assert.strictEqual(reporte.idempotent, false);
      assert.strictEqual(reporte.dry_run, false);
      assert.deepStrictEqual(reporte.verificacion_neo4j, {
        ok: true,
        node_count: 4,
        relation_count: 2,
      });
      assert.strictEqual(reporte.needs_review_count, 0);
      assert.strictEqual(
        reporte.ratificacion,
        "ratificación automática (bypass temporal, ver 5C-FIX)"
      );

      const updateQuery = dbQueriesLogged.find((q) => q.sql.includes("UPDATE volcado"));
      assert.ok(updateQuery);
      assert.strictEqual(updateQuery.params?.[0], `io-${volcadoId}`);

      const auditQuery = dbQueriesLogged.find((q) => q.sql.includes("INSERT INTO volcado_revision_auditoria"));
      assert.ok(auditQuery);
      assert.strictEqual(auditQuery.params?.[7], "cli:primer_vinculo");
      assert.strictEqual(auditQuery.params?.[2], "ingestado");
    });

    await t.test("2. Idempotencia: Volcado ya ingerido reporta idempotent=true y ratificacion=null sin duplicar", async () => {
      mockDbVolcados[0].estado = "ingerido";
      mockDbVolcados[0].io_id = `io-${volcadoId}`;

      const reporte = await ejecutarPrimerVinculo({ volcadoId, dryRun: false });

      assert.strictEqual(reporte.ok, true);
      assert.strictEqual(reporte.volcado_id, volcadoId);
      assert.strictEqual(reporte.estado_volcado, "ingerido");
      assert.strictEqual(reporte.idempotent, true);
      assert.strictEqual(reporte.ratificacion, null);
      assert.deepStrictEqual(reporte.verificacion_neo4j, {
        ok: true,
        node_count: 4,
        relation_count: 2,
      });
    });

    await t.test("3. Rechazo claro si volcado no está en listo_ingesta", async () => {
      mockDbVolcados[0].estado = "en_revision";
      mockDbVolcados[0].io_id = null;

      const reporte = await ejecutarPrimerVinculo({ volcadoId, dryRun: false });

      assert.strictEqual(reporte.ok, false);
      assert.strictEqual(reporte.estado_volcado, "en_revision");
      assert.ok(reporte.error?.includes("La ingesta exige que el volcado esté en estado listo_ingesta"));
    });

    await t.test("4. Dry-run: Valida origen y hace healthcheck del kernel sin modificar BD ni Neo4j", async () => {
      mockDbVolcados[0].estado = "listo_ingesta";
      mockDbVolcados[0].io_id = null;

      fetchMockResponse = async () => ({
        status: 200,
        ok: true,
        json: async () => ({ ok: true, neo4j: true }),
      });

      const reporte = await ejecutarPrimerVinculo({ volcadoId, dryRun: true });

      assert.strictEqual(reporte.ok, true);
      assert.strictEqual(reporte.volcado_id, volcadoId);
      assert.strictEqual(reporte.dry_run, true);
      assert.strictEqual(reporte.estado_volcado, "listo_ingesta");
      assert.strictEqual(reporte.io_id, null);
      assert.deepStrictEqual(reporte.kernel_salud, { ok: true, neo4j: true });
      assert.strictEqual(
        reporte.ratificacion,
        "ratificación automática (bypass temporal, ver 5C-FIX)"
      );
    });

    await t.test("5. Manejo de error en el bridge Python (HTTP 500)", async () => {
      mockDbVolcados[0].estado = "listo_ingesta";
      mockDbVolcados[0].io_id = null;
      dbQueriesLogged = [];

      fetchMockResponse = async () => ({
        status: 500,
        ok: false,
        json: async () => ({ error: "Internal Error in Kernel Python" }),
      });

      const reporte = await ejecutarPrimerVinculo({ volcadoId, dryRun: false });

      assert.strictEqual(reporte.ok, false);
      assert.strictEqual(reporte.estado_volcado, "fallido");
      assert.strictEqual(reporte.error, "Internal Error in Kernel Python");

      const updateQuery = dbQueriesLogged.find((q) => q.sql.includes("UPDATE volcado"));
      assert.ok(updateQuery);
      assert.strictEqual(updateQuery.params?.[1], "Internal Error in Kernel Python");

      const auditQuery = dbQueriesLogged.find((q) => q.sql.includes("INSERT INTO volcado_revision_auditoria"));
      assert.ok(auditQuery);
      assert.strictEqual(auditQuery.params?.[2], "ingesta_fallida");
      assert.strictEqual(auditQuery.params?.[7], "cli:primer_vinculo");
    });
  } finally {
    (neo4j as any).driver = originalDriver;
    if (origUri) process.env.NEO4J_URI = origUri; else delete process.env.NEO4J_URI;
    if (origUser) process.env.NEO4J_USER = origUser; else delete process.env.NEO4J_USER;
    if (origPass) process.env.NEO4J_PASSWORD = origPass; else delete process.env.NEO4J_PASSWORD;
  }
});
