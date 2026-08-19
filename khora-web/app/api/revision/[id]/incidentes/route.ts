// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listarIncidentes } from "@/lib/server/incidentes";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const incidentes = await listarIncidentes(id);
    return NextResponse.json({ incidentes });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message ?? e) }, { status: 500 });
  }
}
