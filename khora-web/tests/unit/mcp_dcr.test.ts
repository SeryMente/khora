// @l0 L0-002 §4 · @req MCP-OAUTH-DCR-01/REQ-2
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createDynamicClientId, validateDynamicClient } from "../../lib/server/mcp-config.js";
import { POST as registerClient } from "../../app/api/oauth/register/route.js";

process.env.MCP_OAUTH_CLIENT_ID = "test-client-id";
process.env.MCP_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.MCP_OAUTH_REDIRECT_URIS = "http://localhost:3000/callback";
process.env.MCP_JWT_SECRET = "test-super-secret-mcp-jwt-key-123456789";
process.env.MCP_ALLOWED_EMAIL = "operador@khora.app";
process.env.MCP_CANONICAL_URL = "https://khora.example.com/api/mcp";

test("DCR registers and validates a Notion public client", async () => {
  const redirect = "https://app.notion.com/workflows/mcp/oauth/callback";
  const request = new NextRequest("https://khora.example.com/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Notion",
      redirect_uris: [redirect],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  const response = await registerClient(request);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.client_id.startsWith("khora-dcr."));
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, redirect), true);
  assert.equal(validateDynamicClient(body.client_id, process.env.MCP_JWT_SECRET!, "https://evil.example/callback"), false);
});

test("DCR rejects non-Notion redirects and tampering", async () => {
  const clientId = createDynamicClientId({ redirect_uris: ["https://app.notion.com/callback"], token_endpoint_auth_method: "none" }, process.env.MCP_JWT_SECRET!);
  assert.equal(validateDynamicClient(clientId + "x", process.env.MCP_JWT_SECRET!), false);
  const request = new NextRequest("https://khora.example.com/api/oauth/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["https://evil.example/callback"], token_endpoint_auth_method: "none" }),
  });
  assert.equal((await registerClient(request)).status, 400);
});
