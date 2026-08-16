// @l0 L0-002-R · @req ING-03/REQ-1,API-00/REQ-1 · @acr ACR-1.2
import "./setup";
import { test, describe } from "node:test";
import assert from "node:assert";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { POST } from "../../app/api/volcado/[id]/aprobar/route";

describe("Aprobar Volcado Route Suite", () => {
  test("1. Retorna 400 cuando falta version o es invalida (< 1 o no entero)", async () => {
    const ctx = { params: Promise.resolve({ id: "volcado-123" }) };

    // Casos invalidos
    const req1 = new Request("http://localhost/api/volcado/volcado-123/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 0 })
    });
    const res1 = await POST(req1, ctx);
    assert.strictEqual(res1.status, 400);

    const req2 = new Request("http://localhost/api/volcado/volcado-123/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1.5 })
    });
    const res2 = await POST(req2, ctx);
    assert.strictEqual(res2.status, 400);

    const req3 = new Request("http://localhost/api/volcado/volcado-123/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const res3 = await POST(req3, ctx);
    assert.strictEqual(res3.status, 400);
  });

  test("2. Retorna 409 cuando la versión no existe o el SHA256 no coincide", async () => {
    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado_version")) {
          // Simulamos que la version no existe
          return { rows: [] };
        }
        return { rows: [] };
      }
    };
    setDbForTesting(mockDb as any);

    try {
      const ctx = { params: Promise.resolve({ id: "volcado-456" }) };
      const req = new Request("http://localhost/api/volcado/volcado-456/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1 })
      });

      const res = await POST(req, ctx);
      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.ok(json.error);
    } finally {
      resetDbForTesting();
    }
  });

  test("3. Retorna 200 con { version, sha256 } en exito", async () => {
    const mockDb = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("FROM volcado_version")) {
          const crypto = await import("crypto");
          const texto = "Texto de prueba";
          const realSha = crypto.createHash("sha256").update(texto, "utf8").digest("hex");
          return {
            rows: [
              {
                version: 1,
                sha256: realSha,
                texto: texto
              }
            ]
          };
        }
        return { rows: [] };
      }
    };
    setDbForTesting(mockDb as any);

    try {
      const ctx = { params: Promise.resolve({ id: "volcado-789" }) };
      const req = new Request("http://localhost/api/volcado/volcado-789/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1 })
      });

      const res = await POST(req, ctx);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.version, 1);
      assert.ok(typeof json.sha256 === "string" && json.sha256.length === 64);
    } finally {
      resetDbForTesting();
    }
  });
});
