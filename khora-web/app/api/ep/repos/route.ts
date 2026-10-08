import { auth } from "@/auth";
import { getEpRepoCatalog, isEpUserAllowed } from "@/lib/server/ep";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } as const;

export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email || "";
  const origin = new URL(req.url).origin;
  if (!email || !isEpUserAllowed(email, origin)) return NextResponse.json({ error: "not_authorized" }, { status: 401, headers: NO_STORE });
  try {
    const repositories = await getEpRepoCatalog();
    return NextResponse.json({ repositories }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "workspace_catalog_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
