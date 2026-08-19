// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolverIncidente } from "@/lib/server/incidentes";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; incId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { incId } = await ctx.params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const codigoResolucion = String(body?.codigoResolucion || "falso_positivo");
    const inc = await resolverIncidente({
      incidenteId: incId,
      usuario: session.user.email,
      codigoResolucion,
      evidenciaResolucion: body?.evidencia,
    });

    return NextResponse.json({ success: true, incidente: inc });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message ?? e) }, { status: 500 });
  }
}
