import { NextRequest, NextResponse } from "next/server";
import { authenticateEpMasterPassword } from "@/lib/server/ep-master-password";
import { createEpMasterSessionToken, epMasterCookieOptions } from "@/lib/ep-master-session";

export const runtime = "nodejs";
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 403, headers: NO_STORE });
  }
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 415, headers: NO_STORE });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 413, headers: NO_STORE });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 400, headers: NO_STORE });
  }
  const password = body && typeof body === "object" && "password" in body
    ? (body as { password?: unknown }).password
    : undefined;
  if (typeof password !== "string" || !password || password.length > 1024) {
    return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 401, headers: NO_STORE });
  }

  try {
    const outcome = await authenticateEpMasterPassword(password, req);
    if (outcome === "rate_limited") {
      return NextResponse.json({ error: "ep_master_auth_temporarily_limited" }, { status: 429, headers: NO_STORE });
    }
    if (outcome !== "accepted") {
      return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 401, headers: NO_STORE });
    }

    const issued = await createEpMasterSessionToken(req.nextUrl.origin);
    if (!issued) {
      return NextResponse.json({ error: "ep_master_auth_unavailable" }, { status: 503, headers: NO_STORE });
    }
    const response = NextResponse.json({ ok: true, expiresAt: new Date(issued.expiresAt * 1000).toISOString() }, { headers: NO_STORE });
    response.cookies.set({
      ...epMasterCookieOptions(issued.expiresAt - Math.floor(Date.now() / 1000)),
      value: issued.token,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "ep_master_auth_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function DELETE(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: "ep_master_auth_rejected" }, { status: 403, headers: NO_STORE });
  }
  const response = NextResponse.json({ ok: true }, { headers: NO_STORE });
  response.cookies.set({
    ...epMasterCookieOptions(0),
    value: "",
  });
  return response;
}
