import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { segmentarEnParrafos } from "../../../../lib/server/pulido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const result = await segmentarEnParrafos(id, { actor: session.user.email });

    return NextResponse.json({
      success: true,
      volcado_id: result.volcado_id,
      texto_estructurado: result.texto_estructurado,
      version: result.version,
      sha256: result.sha256,
      mensaje: "Propuesta de segmentación en párrafos generada exitosamente",
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    let status = 500;
    if (errorMsg.includes("no encontrado")) {
      status = 404;
    } else if (errorMsg.includes("Guardián duro") || errorMsg.includes("Solo se puede segmentar")) {
      status = 409;
    }
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
