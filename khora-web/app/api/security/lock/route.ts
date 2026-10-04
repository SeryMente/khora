import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verificarPin } from "@/lib/server/boveda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "");
    if (!/^\d{4,12}$/.test(pin)) return NextResponse.json({ error: "pin_invalido" }, { status: 400 });
    const ok = await verificarPin(pin);
    return ok ? NextResponse.json({ ok: true, locked: false }) : NextResponse.json({ error: "pin_incorrecto" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "no_se_pudo_verificar_pin", detail: String(error) }, { status: 500 });
  }
}