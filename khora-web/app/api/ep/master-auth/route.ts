import { authenticateEpMasterPassword } from "@/lib/server/ep-master-password";
import { createEpMasterSession, epMasterCookieOptions } from "@/lib/ep-master-session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "master_auth_rejected" }, { status: 403, headers: NO_STORE });
  }
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "master_auth_rejected" }, { status: 415, headers: NO_STORE });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ error: "master_auth_rejected" }, { status: 413, headers: NO_STORE });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "master_auth_rejected" }, { status: 400, headers: NO_STORE });
  }
  const password = body && typeof body === "object" && "password" in body
    ? (body as { password?: unknown }).password
    : undefined;
  if (typeof password !== "string" || password.length < 1 || password.length > 1024) {
    return NextResponse.json({ error: "master_auth_rejected" }, { status: 401, headers: NO_STORE });
  }

  const result = await authenticateEpMasterPassword(password, req);
  if (result === "rate_limited") {
    return NextResponse.json({ error: "master_auth_rate_limited" }, { status: 429, headers: NO_STORE });
  }
  if (result !== "accepted") {
    return NextResponse.json({ error: result === "unavailable" ? "master_auth_unavailable" : "master_auth_rejected" }, { status: result === "unavailable" ? 503 : 401, headers: NO_STORE });
  }

  const configuredEmail = (process.env.EP_ALLOWED_EMAIL || process.env.MCP_ALLOWED_EMAIL || "").trim().toLowerCase();
  const session = await createEpMasterSession(configuredEmail, req.nextUrl.origin);
  if (!session) return NextResponse.json({ error: "master_auth_unavailable" }, { status: 503, headers: NO_STORE });
  const response = NextResponse.json({ ok: true, expiresInSeconds: session.maxAge }, { headers: NO_STORE });
  response.cookies.set({ ...epMasterCookieOptions(session.maxAge), value: session.value });
  return response;
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("origin") && req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "master_auth_rejected" }, { status: 403, headers: NO_STORE });
  }
  const response = NextResponse.json({ ok: true }, { headers: NO_STORE });
  response.cookies.set({ ...epMasterCookieOptions(0), value: "" });
  return response;
}
