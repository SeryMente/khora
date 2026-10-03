// @l0 L0-002-R · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import { auth } from "@/auth";
import { getVaultAgentHistory } from "@/lib/server/vaultAgentToken";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email ? String(session.user.email) : null;
  if (!email) {
    return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    return NextResponse.json(await getVaultAgentHistory(email, req.nextUrl.origin, rawLimit), { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "not_authorized" ? 401 : 503;
    return NextResponse.json({ error: status === 401 ? message : "history_unavailable" }, { status, headers: NO_STORE });
  }
}
