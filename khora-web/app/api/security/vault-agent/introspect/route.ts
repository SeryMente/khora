// @l0 L0-002-R · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import { authenticateVaultAgentToken } from "@/lib/server/vaultAgentToken";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(req: NextRequest) {
  try {
    const row = await authenticateVaultAgentToken(req);
    return NextResponse.json(
      {
        ok: true,
        expiresAt: new Date(row.expira_en).toISOString(),
        issuedAt: new Date(row.emitido_en).toISOString(),
        scope: row.scope,
        audience: row.audience,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = ["invalid_token", "revoked_or_expired", "invalid_capability"].includes(message) ? message : "introspection_unavailable";
    const status = code === "introspection_unavailable" ? 503 : 401;
    return NextResponse.json({ error: code }, { status, headers: NO_STORE });
  }
}
