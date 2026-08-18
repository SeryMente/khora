// @l0 L0-002-R · @req REVISION/REQ-1,UI-TRANSICION-REVISION/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { marcarPendienteRevision, iniciarRevision } from "../../../../../lib/server/volcados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    await marcarPendienteRevision(id);
    await iniciarRevision(id);
    return NextResponse.json({
      success: true,
      volcado_id: id,
      mensaje: "Revision iniciada exitosamente"
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    const status = errorMsg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
