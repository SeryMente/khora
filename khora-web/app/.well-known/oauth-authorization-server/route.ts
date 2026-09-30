// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-3
import { NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";

export async function GET() {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json({ error: "MCP authorization server not configured" }, { status: 503 });
  }

  const metadata = {
    issuer: config.issuer,
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    token_endpoint: `${config.issuer}/api/oauth/token`,
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
    scopes_supported: ["runtime:read", "volcados:read", "offline_access"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  };

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
