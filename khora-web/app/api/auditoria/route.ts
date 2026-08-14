// @l0 L0-002-R · @req TRACE-SESSION/010 · @req AUD-04
import { NextRequest, NextResponse } from "next/server";
import { ejecutarReconciliacionForense } from "../../../lib/server/reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const modeParam = url.searchParams.get("mode")?.toUpperCase();
    const mode = modeParam === "APPLY" ? "APPLY" : "DRY_RUN";

    const resultado = await ejecutarReconciliacionForense(mode);
    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "error_auditoria", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "APPLY" ? "APPLY" : "DRY_RUN";

    const resultado = await ejecutarReconciliacionForense(mode);
    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "error_auditoria", detail: String(err) }, { status: 500 });
  }
}
