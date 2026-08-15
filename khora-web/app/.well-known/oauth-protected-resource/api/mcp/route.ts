// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-4
import { NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";

export async function GET() {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json({ error: "MCP authorization server not configured" }, { status: 503 });
  }

  const metadata = {
    resource: `${config.canonicalUrl}/api/mcp`,
    authorization_servers: [config.canonicalUrl],
    scopes_supported: ["volcados:read"],
  };

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
