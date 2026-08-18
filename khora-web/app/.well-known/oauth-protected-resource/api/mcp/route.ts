// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-4
import { NextResponse } from "next/server";
import { getProtectedResourceMetadata } from "@/lib/server/mcp-config";

export async function GET() {
  const metadata = getProtectedResourceMetadata();
  if (!metadata) {
    return NextResponse.json({ error: "MCP authorization server not configured" }, { status: 503 });
  }

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
