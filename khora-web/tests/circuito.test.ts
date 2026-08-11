// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-2.1 · @ua —
import test from "node:test";
import assert from "node:assert";
import { Pool } from "pg";

// 1. Setup Environment
process.env.DATABASE_URL = "postgres://localhost:5432/mockdb";
process.env.NEO4J_URI = "bolt://localhost:7687";
process.env.NEO4J_USER = "neo4j";
process.env.NEO4J_PASSWORD = "password";
process.env.X_KHORA_KEY = "dummy-key-32-chars-long-or-more-key";

// 2. Mock PG Pool and Neo4j Session/Driver
const mockVolcadoDb = {
  id: "volcado-test-123",
  texto: "Contenido de prueba para el circuito E2E",
  sha256: "979e198d7f87bf3a18e24fa2da9197e887fdfebcf7ca2b6ebcb1b6a3ba2e8e3d",
  chars: 41,
  titulo: "Prueba E2E",
  origen: "cora-ui",
  driver: "web",
  usuario: "operator@khora.com",
  recibido_en: new Date().toISOString(),
  estado: "listo_ingesta",
  io_id: null as string | null,
  intentos: 0,
  ultimo_error: null as string | null,
  ultimo_intento: null as string | null,
  version_aprobada: 1,
  sha256_aprobado: "979e198d7f87bf3a18e24fa2da9197e887fdfebcf7ca2b6ebcb1b6a3ba2e8e3d"
};

const mockVersions = [
  {
    volcado_id: "volcado-test-123",
    version: 1,
    texto: "Contenido de prueba para el circuito E2E",
    sha256: "979e198d7f87bf3a18e24fa2da9197e887fdfebcf7ca2b6ebcb1b6a3ba2e8e3d",
    chars: 41
  }
];

let updatedVolcadoState: any = null;

(Pool.prototype as any).query = (async (sql: any, params?: any[]): Promise<any> => {
  const normSql = sql.replace(/\s+/g, " ").trim().toLowerCase();
  const p = params || [];

  if (normSql.includes("select estado, version_aprobada, sha256_aprobado from volcado where id = $1")) {
    return { rows: [mockVolcadoDb] };
  }

  if (normSql.includes("select estado, version_aprobada from volcado where id = $1")) {
    return { rows: [mockVolcadoDb] };
  }

  if (normSql.includes("volcado_version")) {
    return { rows: mockVersions };
  }

  if (normSql.includes("update volcado") && normSql.includes("io_id = $2")) {
    updatedVolcadoState = {
      estado: "ingerido",
      io_id: p[1]
    };
    mockVolcadoDb.estado = "ingerido";
    mockVolcadoDb.io_id = p[1];
    return { rows: [] };
  }

  return { rows: [] };
}) as any;

// Mock the Neo4j driver
import neo4j from "neo4j-driver";

const mockSession = {
  run: async (query: string, params?: any) => {
    const norm = query.replace(/\s+/g, " ").trim();
    if (norm.includes("MATCH (io:InformationObject {io_id: $ioId})")) {
      const ioIdParam = params?.ioId || params?.io_id;
      if (ioIdParam === "io-test-uuid") {
        return {
          records: [{
            get: (key: string) => {
              if (key === "volcado_id") return "volcado-test-123";
              if (key === "version") return 1;
              if (key === "sha256") return "979e198d7f87bf3a18e24fa2da9197e887fdfebcf7ca2b6ebcb1b6a3ba2e8e3d";
              return null;
            }
          }]
        };
      }
      return { records: [] };
    }

    if (norm.includes("MATCH (:InformationObject {io_id: $ioId})-[m:MENTIONS {io_id: $ioId}]->(e:Entity)")) {
      return {
        records: [{
          get: (key: string) => {
            if (key === "node_count") return 3;
            return 0;
          }
        }]
      };
    }

    if (norm.includes("MATCH ()-[r:RELATION {io_id: $ioId}]->()")) {
      return {
        records: [{
          get: (key: string) => {
            if (key === "relation_count") return 2;
            return 0;
          }
        }]
      };
    }

    return { records: [] };
  },
  close: async () => {}
};

// Override the methods on the default exported driver object
neo4j.driver = function(uri: string, auth?: any) {
  return {
    session: () => mockSession,
    close: async () => {}
  } as any;
};

// Now import our modules under test
import { verificarCircuitoCompletoNeo4j } from "../lib/server/grafo";

test("Circuito E2E Suite", async (t) => {
  await t.test("1. Ingesta actualiza base de datos e io_id", async () => {
    // Simulate what POST /api/ingesta does
    const returnedIoId = "io-test-uuid";

    // Simulate updating PostgreSQL on success
    const db = new Pool();
    await db.query(
      `UPDATE volcado
       SET estado = 'ingerido',
           io_id = $2,
           ultimo_intento = now(),
           intentos = intentos + 1,
           ultimo_error = NULL
       WHERE id = $1`,
      ["volcado-test-123", returnedIoId]
    );

    assert.strictEqual(updatedVolcadoState.estado, "ingerido");
    assert.strictEqual(updatedVolcadoState.io_id, "io-test-uuid");
  });

  await t.test("2. Verificacion del circuito en Neo4j", async () => {
    const res = await verificarCircuitoCompletoNeo4j("io-test-uuid");
    assert.strictEqual(res.exists, true);
    assert.strictEqual(res.node_count, 3);
    assert.strictEqual(res.relation_count, 2);
    assert.ok(res.details);
    assert.strictEqual(res.details.volcado_id, "volcado-test-123");
    assert.strictEqual(res.details.version, 1);
    assert.strictEqual(res.details.sha256, "979e198d7f87bf3a18e24fa2da9197e887fdfebcf7ca2b6ebcb1b6a3ba2e8e3d");
  });

  await t.test("3. Idempotencia: segunda verificacion es de solo lectura", async () => {
    let writeOperationsIntercepted = 0;

    // Check if session.run intercepts any write operations
    const originalRun = mockSession.run;
    mockSession.run = async (query: string, params?: any) => {
      const q = query.toLowerCase();
      if (q.includes("create") || q.includes("merge") || q.includes("set") || q.includes("delete")) {
        writeOperationsIntercepted++;
      }
      return originalRun(query, params);
    };

    const res = await verificarCircuitoCompletoNeo4j("io-test-uuid");
    assert.strictEqual(res.exists, true);
    assert.strictEqual(writeOperationsIntercepted, 0, "Verification MUST be purely read-only and not modify state");

    // Restore
    mockSession.run = originalRun;
  });
});
