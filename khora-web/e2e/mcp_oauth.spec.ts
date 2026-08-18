// @l0 L0-002 §4 · @req MCP-E2E-01/REQ-1
import { test, expect } from "@playwright/test";

test.describe("MCP OAuth Authorization Server & Protected Resource", () => {
  test.beforeEach(async ({ page }) => {
    // Set dummy env variables if needed
  });

  test("/.well-known/oauth-authorization-server returns RFC 8414 metadata", async ({ request }) => {
    const res = await request.get("/.well-known/oauth-authorization-server");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.issuer).toBeDefined();
    expect(body.authorization_endpoint).toContain("/oauth/authorize");
    expect(body.token_endpoint).toContain("/api/oauth/token");
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(body.scopes_supported).toContain("volcados:read");
    expect(body.grant_types_supported).toEqual(["authorization_code", "refresh_token"]);
  });

  test("/.well-known/oauth-protected-resource and specific endpoint return identical RFC 9728 metadata", async ({ request }) => {
    const res1 = await request.get("/.well-known/oauth-protected-resource");
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();

    const res2 = await request.get("/.well-known/oauth-protected-resource/api/mcp");
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();

    expect(body1).toEqual(body2);
    expect(body1.resource).not.toContain("/api/mcp/api/mcp");
    expect(body1.resource).toContain("/api/mcp");
    expect(body1.authorization_servers).toBeDefined();
    expect(body1.authorization_servers[0]).not.toContain("/api/mcp");
    expect(body1.scopes_supported).toContain("volcados:read");
  });

  test("/api/mcp without token responds with 401 and WWW-Authenticate header", async ({ request }) => {
    const res = await request.get("/api/mcp");
    expect(res.status()).toBe(401);
    const header = res.headers()["www-authenticate"];
    expect(header).toBeDefined();
    expect(header).toContain("Bearer resource_metadata=");
    expect(header).toContain("scope=\"volcados:read\"");
  });

  test("Form-urlencoded /api/oauth/token with invalid client credentials returns invalid_client", async ({ request }) => {
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("client_id", "wrong-id");
    params.set("client_secret", "wrong-secret");

    const res = await request.post("/api/oauth/token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: params.toString(),
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });
});
