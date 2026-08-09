// @l0 L0-002-R · @req PIPELINE-OBSERVABILITY/REQ-1
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { obtenerPipelineDetalle } from "@/lib/server/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ detail: "falta el id del volcado" }, { status: 400 });
    }

    const data = await obtenerPipelineDetalle(id);
    if (!data) {
      return NextResponse.json({ detail: "volcado no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { detail: "lectura del detalle del pipeline fallida", causa: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
