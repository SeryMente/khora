import { registrarEventoServicio } from "@/lib/server/service-observability";
import { withHttpDiagnostics } from "@/lib/server/mcp-diagnostic-boundary";
// @l0 L0-002 §4 · @req MCP-OAUTH-DCR-01/REQ-1
import { NextRequest, NextResponse } from "next/server";
import {
  createDynamicClientId,
  getMcpConfig,
  isAllowedDynamicRedirect,
} from "@/lib/server/mcp-config";

async function handlePOST(req: NextRequest) {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json({ error: "server_error", error_description: "MCP configuration missing" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: "Expected JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: "Expected JSON object" }, { status: 400 });
  }
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((value): value is string => typeof value === "string")
    : [];
  const tokenMethod = body.token_endpoint_auth_method == null ? "none" : String(body.token_endpoint_auth_method);
  const grantTypes = Array.isArray(body.grant_types) ? body.grant_types.map(String) : ["authorization_code", "refresh_token"];
  const responseTypes = Array.isArray(body.response_types) ? body.response_types.map(String) : ["code"];

  if (redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every(isAllowedDynamicRedirect)) {
    return NextResponse.json({ error: "invalid_redirect_uri", error_description: "Only HTTPS Notion redirect URIs are allowed" }, { status: 400 });
  }
  if (tokenMethod !== "none" || !grantTypes.includes("authorization_code") || !responseTypes.includes("code")) {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: "PKCE public clients using authorization_code are required" }, { status: 400 });
  }

  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 200) : "Notion MCP";
  const clientId = createDynamicClientId({
    redirect_uris: redirectUris,
    client_name: clientName,
    token_endpoint_auth_method: "none",
  }, config.jwtSecret);

  return NextResponse.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export const POST = withHttpDiagnostics("oauth.register.POST", handlePOST, registrarEventoServicio);
