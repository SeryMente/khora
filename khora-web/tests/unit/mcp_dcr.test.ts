// @l0 L0-002 §4 · @req MCP-OAUTH-DCR-01/REQ-2
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createDynamicClientId, validateDynamicClient, isAllowedDynamicRedirect } from "../../lib/server/mcp-config.js";
import { POST as registerClient } from "../../app/api/oauth/register/route.js";

process.env.MCP_OAUTH_CLIENT_ID = "test-client-id";
process.env.MCP_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.MCP_OAUTH_REDIRECT_URIS = "http://localhost:3000/callback";
process.env.MCP_JWT_SECRET = "test-super-secret-mcp-jwt-key-123456789";
process.env.MCP_ALLOWED_EMAIL = "operador@khora.app";
process.env.MCP_CANONICAL_URL = "https://khora.example.com/api/mcp";

async function register(redirect: string) {
  const request = new NextRequest("https://khora.example.com/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Khora Jules RDC",
      redirect_uris: [redirect],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  return registerClient(request);
}

test("DCR registers and validates a Notion public client", async () => {
  const redirect = "https://app.notion.com/workflows/mcp/oauth/callback";
  const response = await register(redirect);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.client_id.startsWith("khora-dcr."));
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, redirect), true);
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, "https://evil.example/callback"), false);
});

test("DCR accepts a native IPv4 loopback callback and signs its exact URI", async () => {
  const redirect = "http://127.0.0.1:49152/oauth/callback";
  assert.equal(isAllowedDynamicRedirect(redirect), true);
  const response = await register(redirect);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, redirect), true);
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, "http://127.0.0.1:49153/oauth/callback"), false);
});

test("DCR rejects non-loopback, aliases, privileged ports and altered callback paths", async () => {
  const denied = [
    "http://localhost:49152/oauth/callback",
    "http://[::1]:49152/oauth/callback",
    "http://192.168.1.20:49152/oauth/callback",
    "http://2130706433:49152/oauth/callback",
    "http://0x7f000001:49152/oauth/callback",
    "http://127.0.0.1:80/oauth/callback",
    "http://127.0.0.1:49152/callback",
    "http://127.0.0.1:49152/oauth/callback?next=https://evil.example",
    "http://user:pass@127.0.0.1:49152/oauth/callback",
  ];
  for (const redirect of denied) assert.equal(isAllowedDynamicRedirect(redirect), false, redirect);

  const response = await register("http://192.168.1.20:49152/oauth/callback");
  assert.equal(response.status, 400);
});

test("DCR rejects client metadata tampering", async () => {
  const redirect = "https://app.notion.com/callback";
  const clientId = createDynamicClientId({
    redirect_uris: [redirect],
    token_endpoint_auth_method: "none",
  }, process.env.MCP_JWT_SECRET!);
  assert.equal(validateDynamicClient(clientId + "x", process.env.MCP_JWT_SECRET!), false);
});
