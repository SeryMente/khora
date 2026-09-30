import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as postTokenRoute } from "../../app/api/oauth/token/route.js";
import { verifyJwt } from "../../lib/server/jwt.js";
import { hashString } from "../../lib/server/oauth.js";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon.js";

process.env.MCP_OAUTH_CLIENT_ID = "test-client-id";
process.env.MCP_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.MCP_OAUTH_REDIRECT_URIS = "http://localhost:3000/callback";
process.env.MCP_JWT_SECRET = "test-super-secret-mcp-jwt-key-123456789";
process.env.MCP_ALLOWED_EMAIL = "operador@khora.app";
process.env.MCP_CANONICAL_URL = "https://khora.example.com/api/mcp";

const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const rawCode = "chatgpt-cimd-test-code";
const codeHash = hashString(rawCode);

test("ChatGPT CIMD client can exchange a runtime-only authorization code", async () => {
  let used = false;
  const mockRecord = {
    id: 91,
    code_hash: codeHash,
    code_challenge: challenge,
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    resource: "https://khora.example.com/api/mcp",
    scope: "runtime:read",
    usuario: "operador@khora.app",
    expira_en: new Date(Date.now() + 60000),
    usado_en: null as Date | null,
  };

  const mockDbPool = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("FROM oauth_codes")) {
        return used ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [mockRecord] };
      }
      if (sql.includes("UPDATE oauth_codes")) {
        used = true;
        mockRecord.usado_en = new Date();
        return { rowCount: 1, rows: [] };
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

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://chatgpt.com/oauth/client.json") {
      return new Response(JSON.stringify({
        client_id: "https://chatgpt.com/oauth/client.json",
        redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
        token_endpoint_auth_methods_supported: ["none"],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return originalFetch(input, init);
  };

  setDbForTesting(mockDbPool);
  try {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("client_id", "https://chatgpt.com/oauth/client.json");
    form.set("code", rawCode);
    form.set("redirect_uri", mockRecord.redirect_uri);
    form.set("code_verifier", verifier);
    form.set("resource", mockRecord.resource);
    form.set("scope", "runtime:read");

    const response = await postTokenRoute(
      new NextRequest("https://khora.example.com/api/oauth/token", {
        method: "POST",
        body: form,
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.scope, "runtime:read");
    assert.ok(body.access_token);
    assert.ok(body.refresh_token);

    const payload = verifyJwt(body.access_token, process.env.MCP_JWT_SECRET!);
    assert.ok(payload);
    assert.equal(payload.scope, "runtime:read");
    assert.equal(payload.aud, "https://khora.example.com/api/mcp");
    assert.equal(payload.iss, "https://khora.example.com");
  } finally {
    resetDbForTesting();
    globalThis.fetch = originalFetch;
  }
});

test("runtime-only grant refuses escalation to volcados:read at token exchange", async () => {
  let used = false;
  const mockRecord = {
    id: 92,
    code_hash: codeHash + "2",
    code_challenge: challenge,
    redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
    resource: "https://khora.example.com/api/mcp",
    scope: "runtime:read",
    usuario: "operador@khora.app",
    expira_en: new Date(Date.now() + 60000),
    usado_en: null as Date | null,
  };

  const pool = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("FROM oauth_codes")) return used ? { rowCount: 0, rows: [] } : { rowCount: 1, rows: [mockRecord] };
      if (sql.includes("UPDATE oauth_codes")) { used = true; return { rowCount: 1, rows: [] }; }
      if (sql.includes("mcp_revocacion")) return { rowCount: 1, rows: [{ generacion: 1 }] };
      if (sql.includes("INSERT INTO oauth_refresh_tokens")) return { rowCount: 1, rows: [] };
      return { rowCount: 0, rows: [] };
    },
  };

  setDbForTesting(pool);
  try {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("client_id", "https://chatgpt.com/oauth/client.json");
    form.set("code", rawCode);
    form.set("redirect_uri", mockRecord.redirect_uri);
    form.set("code_verifier", verifier);
    form.set("resource", mockRecord.resource);
    form.set("scope", "volcados:read");

    const response = await postTokenRoute(
      new NextRequest("https://khora.example.com/api/oauth/token", {
        method: "POST",
        body: form,
      }),
    );

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_scope");
  } finally {
    resetDbForTesting();
  }
});
