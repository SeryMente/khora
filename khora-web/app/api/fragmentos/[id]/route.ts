import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { obtenerFragmentoPorId } from "../../../../lib/server/fragmentos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ detail: "id de fragmento no válido" }, { status: 400 });
    }

    const detalle = await obtenerFragmentoPorId(id);
    if (!detalle) {
      return NextResponse.json({ detail: "Fragmento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(detalle);
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    return NextResponse.json({ detail: errorMsg }, { status: 500 });
  }
}
