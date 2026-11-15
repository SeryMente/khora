// @l0 L0-002 §4 · @req MCP-MANUAL-TOKEN-01/REQ-1
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createManualMcpToken, authenticateManualMcpToken } from "../../lib/server/mcp-manual-token.js";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon.js";
import { GET as getMcpRoute } from "../../app/api/mcp/route.js";

process.env.MCP_OAUTH_CLIENT_ID = "test-client-id";
process.env.MCP_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.MCP_OAUTH_REDIRECT_URIS = "http://localhost:3000/callback";
process.env.MCP_JWT_SECRET = "test-super-secret-mcp-jwt-key-123456789";
process.env.MCP_ALLOWED_EMAIL = "operador@khora.app";
process.env.MCP_CANONICAL_URL = "https://khora.example.com/api/mcp";
process.env.DATABASE_URL = "postgres://localhost/test";
// The route's production guard runs during Vercel build tests (NODE_ENV=production).
// A test-only placeholder satisfies the configuration gate; getDb() is replaced
// below with an in-memory mock, so no database connection is opened.
process.env.KHORA_READONLY_DATABASE_URL ??= "postgres://unit-test:unit-test@localhost:5432/khora_test";

test("manual Bearer token is high-entropy, scoped, expiring and stored by hash", async () => {
  let inserted: any = null;
  const mockDbPool = {
    query: async (sql: string, params: any[]) => {
      if (sql.includes("SELECT generacion FROM mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 7 }] };
      }
      if (sql.includes("INSERT INTO mcp_manual_tokens")) {
        inserted = {
          id: "11111111-1111-1111-1111-111111111111",
          token_prefix: params[1],
          usuario: params[2],
          resource: params[3],
          scope: params[4],
          generacion: params[5],
          etiqueta: params[6],
          emitido_en: new Date(),
          expira_en: params[7],
          ultimo_uso_en: null,
          revocado_en: null,
        };
        return { rowCount: 1, rows: [inserted] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(mockDbPool);
  try {
    const result = await createManualMcpToken({
      usuario: "operador@khora.app",
      scopes: ["volcados:read", "norm:turn"],
      expiresInDays: 90,
      label: "ChatGPT",
    });

    assert.match(result.token, /^khora_mcp_v1_[0-9a-f]{64}$/);
    assert.equal(result.bearer, "Bearer " + result.token);
    assert.equal(result.record.scope, "volcados:read norm:turn");
    assert.equal(result.record.generacion, 7);
    assert.equal(inserted.token_prefix, result.token.slice(0, 21));
    assert.notEqual(inserted.token_hash, result.token);

    const julesReadToken = await createManualMcpToken({
      usuario: "operador@khora.app",
      scopes: ["jules:read"],
      expiresInDays: 30,
      label: "Jules read test",
    });
    assert.equal(julesReadToken.record.scope, "jules:read");

    const julesWriteToken = await createManualMcpToken({
      usuario: "operador@khora.app",
      scopes: ["jules:write"],
      expiresInDays: 30,
      label: "Jules write test",
    });
    assert.equal(julesWriteToken.record.scope, "jules:write");

    await assert.rejects(
      createManualMcpToken({
        usuario: "operador@khora.app",
        scopes: [],
        expiresInDays: 90,
      }),
      /MANUAL_TOKEN_SCOPE_REQUIRED/,
    );

    await assert.rejects(
      createManualMcpToken({
        usuario: "operador@khora.app",
        scopes: ["norm:turn", "admin:write"],
        expiresInDays: 90,
      }),
      /MANUAL_TOKEN_SCOPE_INVALID/,
    );
  } finally {
    resetDbForTesting();
  }
});

test("manual Bearer token authentication accepts only live hash-backed tokens", async () => {
  let selected = 0;
  let updated = 0;
  const mockDbPool = {
    query: async (sql: string) => {
      if (sql.includes("FROM mcp_manual_tokens")) {
        selected++;
        return {
          rowCount: 1,
          rows: [{
            id: "11111111-1111-1111-1111-111111111111",
            token_prefix: "khora_mcp_v1_deadbeef",
            usuario: "operador@khora.app",
            resource: "https://khora.example.com/api/mcp",
            scope: "runtime:read norm:turn",
            generacion: 4,
            etiqueta: "test",
            emitido_en: new Date(),
            expira_en: new Date(Date.now() + 86400000),
            ultimo_uso_en: null,
            revocado_en: null,
          }],
        };
      }
      if (sql.includes("UPDATE mcp_manual_tokens")) {
        updated++;
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(mockDbPool);
  try {
    const record = await authenticateManualMcpToken("khora_mcp_v1_" + "a".repeat(64));
    assert.ok(record);
    assert.equal(record?.usuario, "operador@khora.app");
    assert.equal(updated, 1);
    assert.equal(selected, 1);

    const nonManual = await authenticateManualMcpToken("eyJhbGciOiJub25lIn0.invalid");
    assert.equal(nonManual, null);
  } finally {
    resetDbForTesting();
  }
});

test("canonical MCP accepts a valid manual Bearer token and still enforces global generation revocation", async () => {
  const manualToken = "khora_mcp_v1_" + "b".repeat(64);
  let generation = 8;

  const mockDbPool = {
    query: async (sql: string) => {
      if (sql.includes("FROM mcp_manual_tokens")) {
        return {
          rowCount: 1,
          rows: [{
            id: "22222222-2222-2222-2222-222222222222",
            token_prefix: manualToken.slice(0, 22),
            usuario: "operador@khora.app",
            resource: "https://khora.example.com/api/mcp",
            scope: "volcados:read runtime:read norm:turn",
            generacion: 8,
            etiqueta: "ChatGPT",
            emitido_en: new Date(),
            expira_en: new Date(Date.now() + 86400000),
            ultimo_uso_en: null,
            revocado_en: null,
          }],
        };
      }
      if (sql.includes("UPDATE mcp_manual_tokens")) return { rowCount: 1, rows: [] };
      if (sql.includes("FROM mcp_revocacion")) return { rowCount: 1, rows: [{ generacion: generation }] };
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(mockDbPool);
  try {
    const req = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: "Bearer " + manualToken },
    });
    const res = await getMcpRoute(req);
    assert.notEqual(res.status, 401);

    generation = 9;
    const revokedReq = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: "Bearer " + manualToken },
    });
    const revokedRes = await getMcpRoute(revokedReq);
    assert.equal(revokedRes.status, 401);
  } finally {
    resetDbForTesting();
  }
});
