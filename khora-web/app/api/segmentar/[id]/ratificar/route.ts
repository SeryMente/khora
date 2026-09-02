import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { ratificarEstructura } from "../../../../../lib/server/pulido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const result = await ratificarEstructura(id, { actor: session.user.email });

    return NextResponse.json({
      success: true,
      volcado_id: result.volcado_id,
      estructura_ratificada_en: result.estructura_ratificada_en,
      version: result.version,
      sha256: result.sha256,
      mensaje: "Estructura en párrafos ratificada exitosamente",
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    let status = 500;
    if (errorMsg.includes("no encontrado")) {
      status = 404;
    } else if (errorMsg.includes("No existe una propuesta") || errorMsg.includes("Solo se puede ratificar")) {
      status = 409;
    }
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
