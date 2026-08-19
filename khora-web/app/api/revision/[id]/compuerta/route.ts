// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { evaluarCompuertaAprobacion } from "@/lib/server/compuerta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { detail: "no autenticado" },
      { status: 401 }
    );
  }

  try {
    const { id } = await ctx.params;
    const decision = await evaluarCompuertaAprobacion(id, session.user.email);

    return NextResponse.json(decision);
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    const status = errorMsg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json(
      { detail: errorMsg },
      { status }
    );
  }
}
