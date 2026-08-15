// @l0 L0-002 §4 · @req MCP-TEST-02/REQ-1
import test from "node:test";
import assert from "node:assert/strict";
import { rotarRefreshToken } from "../../lib/server/oauth.js";
import { signJwt } from "../../lib/server/jwt.js";
import { getMcpConfig } from "../../lib/server/mcp-config.js";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon.js";
import { NextRequest } from "next/server";
import { GET as getMcpRoute } from "../../app/api/mcp/route.js";
import { GET as getProtectedResourceMetadata } from "../../app/.well-known/oauth-protected-resource/route.js";
import { GET as getAuthServerMetadata } from "../../app/.well-known/oauth-authorization-server/route.js";
import {
  toolKhoraResumen,
  toolKhoraListarVolcados,
  toolKhoraLeerVolcado,
  toolKhoraBuscarVolcados,
  toolKhoraVersionesVolcado,
} from "../../lib/server/mcp-tools.js";

process.env.MCP_OAUTH_CLIENT_ID = "test-client-id";
process.env.MCP_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.MCP_OAUTH_REDIRECT_URIS = "https://claude.ai/api/mcp/callback,http://localhost:3000/callback";
process.env.MCP_JWT_SECRET = "test-super-secret-mcp-jwt-key-123456789";
process.env.MCP_ALLOWED_EMAIL = "operador@khora.app";
process.env.MCP_CANONICAL_URL = "https://khora.example.com/api/mcp";

test("1. Concurrent refresh token rotation produces exactly 1 success and 1 invalid_grant", async () => {
  let tokenRotatedCount = 0;
  let simulatedRotadoA: string | null = null;

  const mockDbPool = {
    connect: async () => {
      return {
        query: async (sql: string, params: any[]) => {
          if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
            return;
          }
          if (sql.includes("UPDATE oauth_refresh_tokens")) {
            if (simulatedRotadoA === null) {
              simulatedRotadoA = params[0];
              tokenRotatedCount++;
              return {
                rowCount: 1,
                rows: [
                  {
                    id: 101,
                    token_hash: params[1],
                    usuario: "operador@khora.app",
                    resource: "https://khora.example.com/api/mcp",
                    emitido_en: new Date(),
                    expira_en: new Date(Date.now() + 100000),
                    rotado_a: params[0],
                  },
                ],
              };
            } else {
              return { rowCount: 0, rows: [] };
            }
          }
          if (sql.includes("INSERT INTO oauth_refresh_tokens")) {
            return { rowCount: 1, rows: [] };
          }
          return { rowCount: 0, rows: [] };
        },
        release: () => {},
      };
    },
    query: async () => ({ rowCount: 0, rows: [] }),
  };

  setDbForTesting(mockDbPool);

  try {
    const initialRawToken = "test-refresh-token-1234567890";

    const [res1, res2] = await Promise.all([
      rotarRefreshToken(initialRawToken),
      rotarRefreshToken(initialRawToken),
    ]);

    const successes = [res1, res2].filter((r) => r !== null);
    const failures = [res1, res2].filter((r) => r === null);

    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    assert.ok(successes[0]?.newToken);
    assert.equal(tokenRotatedCount, 1);

    const res3 = await rotarRefreshToken(initialRawToken);
    assert.equal(res3, null);
  } finally {
    resetDbForTesting();
  }
});

test("2. MCP_CANONICAL_URL semantics and metadata endpoints", async () => {
  const config = getMcpConfig();
  assert.ok(config);
  assert.equal(config.canonicalUrl, "https://khora.example.com/api/mcp");
  assert.equal(config.issuer, "https://khora.example.com");

  const protectedRes = await getProtectedResourceMetadata();
  const protectedMeta = await protectedRes.json();
  assert.equal(protectedMeta.resource, "https://khora.example.com/api/mcp");
  assert.deepEqual(protectedMeta.authorization_servers, ["https://khora.example.com"]);
  assert.deepEqual(protectedMeta.scopes_supported, ["volcados:read"]);

  const authRes = await getAuthServerMetadata();
  const authMeta = await authRes.json();
  assert.equal(authMeta.issuer, "https://khora.example.com");
  assert.equal(authMeta.authorization_endpoint, "https://khora.example.com/oauth/authorize");
  assert.equal(authMeta.token_endpoint, "https://khora.example.com/api/oauth/token");
});

test("3. JWT validation on /api/mcp (iss, aud, scope, gen, exp)", async () => {
  const secret = process.env.MCP_JWT_SECRET!;
  const now = Math.floor(Date.now() / 1000);

  const mockDbPool = {
    query: async (sql: string) => {
      if (sql.includes("mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 1 }] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(mockDbPool);

  try {
    const validPayload = {
      iss: "https://khora.example.com",
      sub: "operador@khora.app",
      aud: "https://khora.example.com/api/mcp",
      scope: "volcados:read",
      gen: 1,
      exp: now + 3600,
      iat: now,
      jti: "token-1",
    };

    // 3a. Invalid signature / malformed token -> 401
    const req1 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: "Bearer invalid.jwt.token" },
    });
    const res1 = await getMcpRoute(req1);
    assert.equal(res1.status, 401);
    assert.ok(
      res1.headers
        .get("www-authenticate")
        ?.includes('Bearer resource_metadata="https://khora.example.com/.well-known/oauth-protected-resource"')
    );

    // 3b. Invalid issuer (iss) -> 401
    const badIssToken = signJwt({ ...validPayload, iss: "https://evil-issuer.com" }, secret);
    const req2 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${badIssToken}` },
    });
    const res2 = await getMcpRoute(req2);
    assert.equal(res2.status, 401);

    // 3c. Invalid audience (aud) -> 401
    const badAudToken = signJwt(
      { ...validPayload, aud: "https://khora.example.com/other" },
      secret
    );
    const req3 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${badAudToken}` },
    });
    const res3 = await getMcpRoute(req3);
    assert.equal(res3.status, 401);

    // 3d. Missing required scope ("volcados:read") -> 401
    const noScopeToken = signJwt({ ...validPayload, scope: "other:read" }, secret);
    const req4 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${noScopeToken}` },
    });
    const res4 = await getMcpRoute(req4);
    assert.equal(res4.status, 401);

    // 3e. Expired token -> 401
    const expiredToken = signJwt({ ...validPayload, exp: now - 60 }, secret);
    const req5 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res5 = await getMcpRoute(req5);
    assert.equal(res5.status, 401);

    // 3f. Valid token -> Not 401
    const validToken = signJwt(validPayload, secret);
    const req6 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${validToken}` },
    });
    const res6 = await getMcpRoute(req6);
    assert.notEqual(res6.status, 401);

    // 3g. Revoked generation -> 401
    const revokedPayloadToken = signJwt({ ...validPayload, gen: 1 }, secret);
    setDbForTesting({
      query: async () => ({ rowCount: 1, rows: [{ generacion: 2 }] }),
    });

    const req7 = new NextRequest("https://khora.example.com/api/mcp", {
      headers: { authorization: `Bearer ${revokedPayloadToken}` },
    });
    const res7 = await getMcpRoute(req7);
    assert.equal(res7.status, 401);
  } finally {
    resetDbForTesting();
  }
});

test("4. Missing KHORA_READONLY_DATABASE_URL in production returns 503", async () => {
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalReadonlyUrl = process.env.KHORA_READONLY_DATABASE_URL;

  try {
    process.env.VERCEL_ENV = "production";
    delete process.env.KHORA_READONLY_DATABASE_URL;

    const req = new NextRequest("https://khora.example.com/api/mcp");
    const res = await getMcpRoute(req);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.error, "server_error");
    assert.ok(data.error_description.includes("KHORA_READONLY_DATABASE_URL mandatory"));
  } finally {
    process.env.VERCEL_ENV = originalVercelEnv;
    if (originalReadonlyUrl) {
      process.env.KHORA_READONLY_DATABASE_URL = originalReadonlyUrl;
    } else {
      delete process.env.KHORA_READONLY_DATABASE_URL;
    }
  }
});

test("5. MCP Tools signature and export validation", () => {
  assert.equal(typeof toolKhoraResumen, "function");
  assert.equal(typeof toolKhoraListarVolcados, "function");
  assert.equal(typeof toolKhoraLeerVolcado, "function");
  assert.equal(typeof toolKhoraBuscarVolcados, "function");
  assert.equal(typeof toolKhoraVersionesVolcado, "function");
});
