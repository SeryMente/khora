// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-3
import { NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";

export async function GET() {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json({ error: "MCP authorization server not configured" }, { status: 503 });
  }

  const metadata = {
    issuer: config.canonicalUrl,
    authorization_endpoint: `${config.canonicalUrl}/oauth/authorize`,
    token_endpoint: `${config.canonicalUrl}/api/oauth/token`,
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["volcados:read", "offline_access"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  };

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
