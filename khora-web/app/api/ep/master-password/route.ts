import { auth } from "@/auth";
import { isEpUserAllowed } from "@/lib/server/ep";
import { getEpMasterPasswordStatus, setEpMasterPassword } from "@/lib/server/ep-master-password";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

async function oidcUser(req: NextRequest): Promise<string> {
  const session = await auth();
  const email = session?.user?.email || "";
  return email && isEpUserAllowed(email, req.nextUrl.origin) ? email.toLowerCase() : "";
}

export async function GET(req: NextRequest) {
  const email = await oidcUser(req);
  if (!email) return NextResponse.json({ error: "oidc_reauthentication_required" }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await getEpMasterPasswordStatus(), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "master_password_status_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function PUT(req: NextRequest) {
  const email = await oidcUser(req);
  if (!email) return NextResponse.json({ error: "oidc_reauthentication_required" }, { status: 401, headers: NO_STORE });
  if (req.headers.get("origin") !== req.nextUrl.origin || !(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 403, headers: NO_STORE });
  }
  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ error: "invalid_request" }, { status: 413, headers: NO_STORE });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  const password = body && typeof body === "object" && "password" in body
    ? (body as { password?: unknown }).password
    : undefined;
  if (typeof password !== "string" || password.length < 16 || password.length > 1024) {
    return NextResponse.json({ error: "master_password_policy" }, { status: 400, headers: NO_STORE });
  }
  try {
    await setEpMasterPassword(password, email);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "master_password_save_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
