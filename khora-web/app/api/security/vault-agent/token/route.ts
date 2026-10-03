// @l0 L0-002-R · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import { auth } from "@/auth";
import { getVaultAgentStatus, issueVaultAgentToken, revokeVaultAgentTokenForUser, VAULT_AGENT_MINUTES } from "@/lib/server/vaultAgentToken";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

async function getEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ? String(session.user.email) : null;
}

export async function GET(req: NextRequest) {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await getVaultAgentStatus(email, req.nextUrl.origin), { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "not_authorized" ? 401 : 503;
    return NextResponse.json({ error: status === 401 ? message : "status_unavailable" }, { status, headers: NO_STORE });
  }
}

export async function POST(req: NextRequest) {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });

  try {
    const body = await req.json().catch(() => ({}));
    const minutes = Number((body as { minutes?: unknown })?.minutes ?? VAULT_AGENT_MINUTES);
    if (minutes !== VAULT_AGENT_MINUTES) {
      return NextResponse.json({ error: "fixed_one_hour_capability", minutes: VAULT_AGENT_MINUTES }, { status: 400, headers: NO_STORE });
    }

    const issued = await issueVaultAgentToken(email, req.nextUrl.origin);
    return NextResponse.json(issued, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "not_authorized") return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
    if (message === "rate_limit_exceeded") return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429, headers: NO_STORE });
    return NextResponse.json({ error: "token_issue_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function DELETE(req: NextRequest) {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  try {
    const revoked = await revokeVaultAgentTokenForUser(email, req.nextUrl.origin);
    return NextResponse.json({ ok: true, revoked }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "not_authorized" ? 401 : 503;
    return NextResponse.json({ error: status === 401 ? message : "revoke_unavailable" }, { status, headers: NO_STORE });
  }
}
