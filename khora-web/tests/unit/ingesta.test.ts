// @l0 L0-002-R · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1
import "./setup";
import assert from "assert";
import test from "node:test";
import { Pool } from "pg";
import { randomUUID } from "crypto";

// Ensure dummy auth env values to prevent next-auth init errors
process.env.AUTH_SECRET = "mock-secret";
process.env.OIDC_ISSUER_URL = "http://localhost";
process.env.PLAYWRIGHT_TEST_RUN = "1";
process.env.PLAYWRIGHT_TEST_BYPASS = "true";
process.env.DATABASE_URL = "postgres://localhost:5432/mockdb";
process.env.X_KHORA_KEY = "test-khora-key-12345678901234567890";

// Global fetch mock helper
let fetchMockResponse: () => Promise<any> = async () => ({
  status: 200,
  ok: true,
  json: async () => ({
    io_id: "mock-io-id-999",
    counters: { create: 5, update: 2, ignore: 1 },
    ts: "2026-07-25T12:00:00Z"
  })
});

// Override globalThis.fetch
globalThis.fetch = (async (url: any, options: any) => {
  return fetchMockResponse();
}) as any;

// DB Mock State
let mockDbVolcados: any[] = [];
let mockDbVersions: any[] = [];
let dbQueriesLogged: { sql: string; params?: any[] }[] = [];

// Override Pool.prototype.query
(Pool.prototype as any).query = async function (sql: string, params?: any[]) {
  dbQueriesLogged.push({ sql, params });
  const sqlNormalized = sql.trim().toLowerCase();

  // 1. SELECT from volcado
  if (sqlNormalized.includes("select") && sqlNormalized.includes("volcado") && !sqlNormalized.includes("volcado_version")) {
    const idParam = params ? params[0] : null;
    const found = mockDbVolcados.find(v => v.id === idParam);
    return { rows: found ? [found] : [] };
  }

  // 2. SELECT from volcado_version (listarVersiones)
  if (sqlNormalized.includes("select") && sqlNormalized.includes("volcado_version")) {
    const idParam = params ? params[0] : null;
    const found = mockDbVersions.filter(v => v.volcado_id === idParam);
    return { rows: found };
  }

  // 3. UPDATE/INSERT queries
  return { rows: [] };
};

import { POST } from "../../app/api/ingesta/route";
import { sha256de } from "../../lib/server/correcciones";
import { cifrarTexto } from "../../lib/server/cripto";

test("Ingesta Route Suite", async (t) => {
  const volcadoId = randomUUID();
  const textContent = "Texto de prueba para ingesta real";
  const sha = sha256de(textContent);

  // Setup initial mock DB state
  mockDbVolcados = [
    {
      id: volcadoId,
      estado: "listo_ingesta",
      version_aprobada: 1,
      sha256_aprobado: sha
    }
  ];

  mockDbVersions = [
    {
      volcado_id: volcadoId,
      version: 1,
      texto: cifrarTexto(textContent), // text is stored encrypted
      sha256: sha,
      chars: textContent.length,
      motivo: "Aprobado"
    }
  ];

  await t.test("1. Ingesta de versión aprobada - Ingesta exitosa con io_id persistido", async () => {
    fetchMockResponse = async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        io_id: "stable-io-id-777",
        counters: { create: 3, update: 1, ignore: 0 },
        ts: new Date().toISOString()
      })
    });

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    dbQueriesLogged = [];
    const response = await POST(request);
    assert.strictEqual(response.status, 200);

    const body = await response.json();
    assert.strictEqual(body.io_id, "stable-io-id-777");
    assert.strictEqual(body.counters.create, 3);

    const updateQuery = dbQueriesLogged.find(q => q.sql.includes("estado = 'ingerido'"));
    assert.ok(updateQuery);
    assert.strictEqual(updateQuery.params?.[0], "stable-io-id-777");
    assert.strictEqual(updateQuery.params?.[1], volcadoId);

    // Verify audit log entry
    const auditQuery = dbQueriesLogged.find(q => q.sql.includes("INSERT INTO volcado_revision_auditoria"));
    assert.ok(auditQuery);
    assert.strictEqual(auditQuery.params?.[2], "ingestado");
    assert.strictEqual(auditQuery.params?.[3], "listo_ingesta");
    assert.strictEqual(auditQuery.params?.[4], "ingerido");
  });

  await t.test("2. Rechazo de versión no aprobada", async () => {
    // Modify mock DB: change version_aprobada to 2
    mockDbVolcados[0].version_aprobada = 2;

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1"); // requested 1, but approved is 2

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 409);
    const body = await response.json();
    assert.ok(body.error.includes("La version solicitada no coincide"));

    // Restore version_aprobada
    mockDbVolcados[0].version_aprobada = 1;
  });

  await t.test("3. Rechazo de SHA incorrecto", async () => {
    // Modify mock DB sha256_aprobado to mismatch version
    mockDbVolcados[0].sha256_aprobado = "mismatch-sha-value";

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 409);
    const body = await response.json();
    assert.ok(body.error.includes("integridad rota"));

    // Restore sha256_aprobado
    mockDbVolcados[0].sha256_aprobado = sha;
  });

  await t.test("4. volcado_id inexistente", async () => {
    const fakeId = randomUUID();
    const formData = new FormData();
    formData.append("volcado_id", fakeId);
    formData.append("version", "1");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 404);
    const body = await response.json();
    assert.ok(body.error.includes("no encontrado"));
  });

  await t.test("5. versión inexistente", async () => {
    // Change version_aprobada to 99 so it passes first check but has no version row
    mockDbVolcados[0].version_aprobada = 99;

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "99");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 404);
    const body = await response.json();
    assert.ok(body.error.includes("version inexistente"));

    mockDbVolcados[0].version_aprobada = 1;
  });

  await t.test("6. Fallo del kernel (500 Error)", async () => {
    dbQueriesLogged = [];
    fetchMockResponse = async () => ({
      status: 500,
      ok: false,
      json: async () => ({ error: "Kernel internal error details" })
    });

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 500);

    // Assert state is set to 'fallido' in DB
    const updateQuery = dbQueriesLogged.find(q => q.sql.includes("UPDATE volcado"));
    assert.ok(updateQuery);
    assert.ok(updateQuery.sql.includes("estado = $3"));
    assert.strictEqual(updateQuery.params?.[2], "fallido");
    assert.strictEqual(updateQuery.params?.[1], "Kernel internal error details");

    // Verify audit log
    const auditQuery = dbQueriesLogged.find(q => q.sql.includes("INSERT INTO volcado_revision_auditoria"));
    assert.ok(auditQuery);
    assert.strictEqual(auditQuery.params?.[2], "ingesta_fallida");
    assert.strictEqual(auditQuery.params?.[4], "fallido");
  });

  await t.test("7. Request Timeout", async () => {
    dbQueriesLogged = [];
    fetchMockResponse = async () => {
      const err: any = new Error("Request to kernel timed out");
      err.name = "AbortError";
      throw err;
    };

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1");

    const request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    assert.strictEqual(response.status, 504);

    // State is 'fallido' in DB
    const updateQuery = dbQueriesLogged.find(q => q.sql.includes("UPDATE volcado"));
    assert.ok(updateQuery);
    assert.strictEqual(updateQuery.params?.[2], "fallido");
    assert.strictEqual(updateQuery.params?.[1], "Request to kernel timed out");
  });

  await t.test("8. Retry & Idempotency - Allows retry from fallido and ingerido", async () => {
    // 8a. Retry from 'fallido'
    mockDbVolcados[0].estado = "listo_ingesta";
    dbQueriesLogged = [];
    fetchMockResponse = async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        io_id: "idempotent-io-id",
        counters: { create: 0, update: 0, ignore: 15 },
        ts: new Date().toISOString()
      })
    });

    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", "1");

    let request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    let response = await POST(request);
    assert.strictEqual(response.status, 200);

    let updateQuery = dbQueriesLogged.find(q => q.sql.toLowerCase().includes("update volcado"));
    assert.ok(updateQuery);
    assert.strictEqual(updateQuery.params?.[0], "idempotent-io-id");
    assert.ok(updateQuery.sql.toLowerCase().includes("estado = 'ingerido'"));

    // 8b. Retry/Re-attempt from 'listo_ingesta'
    mockDbVolcados[0].estado = "listo_ingesta";
    dbQueriesLogged = [];

    request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    response = await POST(request);
    assert.strictEqual(response.status, 200);
    updateQuery = dbQueriesLogged.find(q => q.sql.toLowerCase().includes("update volcado"));
    assert.ok(updateQuery);
    assert.strictEqual(updateQuery.params?.[0], "idempotent-io-id");
    assert.ok(updateQuery.sql.toLowerCase().includes("estado = 'ingerido'"));

    // 8c. Ensure retry from 'listo_ingesta' DOES NOT downgrade if fetch fails
    dbQueriesLogged = [];
    fetchMockResponse = async () => {
      throw new Error("Kernel offline");
    };

    request = new Request("http://localhost/api/ingesta", {
      method: "POST",
      body: formData,
    });

    response = await POST(request);
    assert.strictEqual(response.status, 502);

    updateQuery = dbQueriesLogged.find(q => q.sql.toLowerCase().includes("update volcado"));
    assert.ok(updateQuery);
    assert.strictEqual(updateQuery.params?.[2], "fallido");
    assert.strictEqual(updateQuery.params?.[1], "Kernel offline");
  });
});
