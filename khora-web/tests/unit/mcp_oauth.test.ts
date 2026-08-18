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
import { GET as getSpecificProtectedResourceMetadata } from "../../app/.well-known/oauth-protected-resource/api/mcp/route.js";
import { GET as getAuthServerMetadata } from "../../app/.well-known/oauth-authorization-server/route.js";
import { POST as postTokenRoute } from "../../app/api/oauth/token/route.js";
import { verifyPkceS256, verifyJwt } from "../../lib/server/jwt.js";
import { hashString } from "../../lib/server/oauth.js";
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

test("2. MCP_CANONICAL_URL semantics and metadata endpoints consistency", async () => {
  const config = getMcpConfig();
  assert.ok(config);
  assert.equal(config.canonicalUrl, "https://khora.example.com/api/mcp");
  assert.equal(config.issuer, "https://khora.example.com");

  const protectedRes = await getProtectedResourceMetadata();
  const protectedMeta = await protectedRes.json();

  const specificRes = await getSpecificProtectedResourceMetadata();
  const specificMeta = await specificRes.json();

  // Root endpoint and specific endpoint MUST return identical responses
  assert.deepEqual(protectedMeta, specificMeta);

  assert.equal(protectedMeta.resource, "https://khora.example.com/api/mcp");
  assert.ok(!protectedMeta.resource.includes("/api/mcp/api/mcp"));
  assert.deepEqual(protectedMeta.authorization_servers, ["https://khora.example.com"]);
  assert.deepEqual(protectedMeta.scopes_supported, ["volcados:read"]);

  const authRes = await getAuthServerMetadata();
  const authMeta = await authRes.json();
  assert.equal(authMeta.issuer, "https://khora.example.com");
  assert.equal(authMeta.authorization_endpoint, "https://khora.example.com/oauth/authorize");
  assert.equal(authMeta.token_endpoint, "https://khora.example.com/api/oauth/token");
});

test("2b. PKCE S256 verification behavior", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const validChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"; // BASE64URL(SHA256(verifier))

  assert.ok(verifyPkceS256(verifier, validChallenge));
  assert.equal(verifyPkceS256(verifier, "wrong-challenge"), false);
  assert.equal(verifyPkceS256("wrong-verifier", validChallenge), false);
  assert.equal(verifyPkceS256("", validChallenge), false);
  assert.equal(verifyPkceS256(verifier, ""), false);
});

test("2c. Atomic authorization code consumption & resource validation in /api/oauth/token", async () => {
  const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  const rawCode = "valid-test-code-123456789";
  const codeHash = hashString(rawCode);

  let mockCodeRecord = {
    id: 55,
    code_hash: codeHash,
    code_challenge: codeChallenge,
    redirect_uri: "https://app.notion.com/workflows/mcp/oauth/callback",
    resource: "https://khora.example.com/api/mcp",
    usuario: "operador@khora.app",
    expira_en: new Date(Date.now() + 60000),
    usado_en: null as Date | null,
  };

  const mockDbPool = {
    query: async (sql: string, params: any[]) => {
      if (sql.includes("FROM oauth_codes")) {
        if (mockCodeRecord.usado_en !== null) {
          return { rowCount: 0, rows: [] };
        }
        if (params[0] === codeHash) {
          return { rowCount: 1, rows: [mockCodeRecord] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("UPDATE oauth_codes")) {
        if (mockCodeRecord.id === params[0] && mockCodeRecord.usado_en === null) {
          mockCodeRecord.usado_en = new Date();
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("mcp_revocacion")) {
        return { rowCount: 1, rows: [{ generacion: 1 }] };
      }
      if (sql.includes("INSERT INTO oauth_refresh_tokens")) {
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(mockDbPool);

  try {
    // 1. Invalid client credentials -> invalid_client (401)
    const formDataBadClient = new FormData();
    formDataBadClient.set("grant_type", "authorization_code");
    formDataBadClient.set("client_id", "bad-id");
    formDataBadClient.set("client_secret", "bad-secret");
    formDataBadClient.set("code", rawCode);
    formDataBadClient.set("redirect_uri", mockCodeRecord.redirect_uri);
    formDataBadClient.set("code_verifier", codeVerifier);

    const reqBadClient = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataBadClient,
    });
    const resBadClient = await postTokenRoute(reqBadClient);
    assert.equal(resBadClient.status, 401);
    const bodyBadClient = await resBadClient.json();
    assert.equal(bodyBadClient.error, "invalid_client");
    assert.equal(mockCodeRecord.usado_en, null); // Not consumed

    // 2. Mismatched redirect_uri -> invalid_grant (400), code NOT consumed
    const formDataBadRedirect = new FormData();
    formDataBadRedirect.set("grant_type", "authorization_code");
    formDataBadRedirect.set("client_id", "test-client-id");
    formDataBadRedirect.set("client_secret", "test-client-secret");
    formDataBadRedirect.set("code", rawCode);
    formDataBadRedirect.set("redirect_uri", "https://evil.com/callback");
    formDataBadRedirect.set("code_verifier", codeVerifier);

    const reqBadRedirect = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataBadRedirect,
    });
    const resBadRedirect = await postTokenRoute(reqBadRedirect);
    assert.equal(resBadRedirect.status, 400);
    const bodyBadRedirect = await resBadRedirect.json();
    assert.equal(bodyBadRedirect.error, "invalid_grant");
    assert.equal(mockCodeRecord.usado_en, null); // Still not consumed!

    // 3. Mismatched code_verifier -> invalid_grant (400), code NOT consumed
    const formDataBadVerifier = new FormData();
    formDataBadVerifier.set("grant_type", "authorization_code");
    formDataBadVerifier.set("client_id", "test-client-id");
    formDataBadVerifier.set("client_secret", "test-client-secret");
    formDataBadVerifier.set("code", rawCode);
    formDataBadVerifier.set("redirect_uri", mockCodeRecord.redirect_uri);
    formDataBadVerifier.set("code_verifier", "wrong-code-verifier");

    const reqBadVerifier = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataBadVerifier,
    });
    const resBadVerifier = await postTokenRoute(reqBadVerifier);
    assert.equal(resBadVerifier.status, 400);
    const bodyBadVerifier = await resBadVerifier.json();
    assert.equal(bodyBadVerifier.error, "invalid_grant");
    assert.equal(mockCodeRecord.usado_en, null); // Still not consumed!

    // 4. Mismatched resource parameter -> invalid_grant (400), code NOT consumed
    const formDataBadResource = new FormData();
    formDataBadResource.set("grant_type", "authorization_code");
    formDataBadResource.set("client_id", "test-client-id");
    formDataBadResource.set("client_secret", "test-client-secret");
    formDataBadResource.set("code", rawCode);
    formDataBadResource.set("redirect_uri", mockCodeRecord.redirect_uri);
    formDataBadResource.set("code_verifier", codeVerifier);
    formDataBadResource.set("resource", "https://khora.example.com/other-resource");

    const reqBadResource = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataBadResource,
    });
    const resBadResource = await postTokenRoute(reqBadResource);
    assert.equal(resBadResource.status, 400);
    const bodyBadResource = await resBadResource.json();
    assert.equal(bodyBadResource.error, "invalid_grant");
    assert.equal(mockCodeRecord.usado_en, null); // Still not consumed!

    // 5. Subsequent VALID exchange -> 200 OK, code is consumed exactly once
    const formDataValid = new FormData();
    formDataValid.set("grant_type", "authorization_code");
    formDataValid.set("client_id", "test-client-id");
    formDataValid.set("client_secret", "test-client-secret");
    formDataValid.set("code", rawCode);
    formDataValid.set("redirect_uri", mockCodeRecord.redirect_uri);
    formDataValid.set("code_verifier", codeVerifier);
    formDataValid.set("resource", "https://khora.example.com/api/mcp");

    const reqValid = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataValid,
    });
    const resValid = await postTokenRoute(reqValid);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.ok(bodyValid.access_token);
    assert.ok(bodyValid.refresh_token);
    assert.equal(bodyValid.scope, "volcados:read");
    assert.ok(mockCodeRecord.usado_en !== null); // Marked consumed!

    // Validate JWT claims
    const payload = verifyJwt(bodyValid.access_token, process.env.MCP_JWT_SECRET!);
    assert.ok(payload);
    assert.equal(payload.iss, "https://khora.example.com");
    assert.equal(payload.aud, "https://khora.example.com/api/mcp");
    assert.equal(payload.scope, "volcados:read");

    // 6. Second exchange with same code -> invalid_grant (400)
    const reqSecond = new NextRequest("https://khora.example.com/api/oauth/token", {
      method: "POST",
      body: formDataValid,
    });
    const resSecond = await postTokenRoute(reqSecond);
    assert.equal(resSecond.status, 400);
    const bodySecond = await resSecond.json();
    assert.equal(bodySecond.error, "invalid_grant");
  } finally {
    resetDbForTesting();
  }
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
