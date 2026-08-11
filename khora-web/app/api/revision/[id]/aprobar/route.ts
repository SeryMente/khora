// @l0 L0-002-R · @req REVISION/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { aprobarVersion } from "../../../../../lib/server/volcados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ detail: "JSON invalido en el cuerpo de la peticion" }, { status: 400 });
    }

    const version = Number(body?.version);
    if (isNaN(version) || version <= 0) {
      return NextResponse.json({ detail: "version invalida o ausente" }, { status: 400 });
    }

    const result = await aprobarVersion(id, version, session.user.email);
    return NextResponse.json({
      success: true,
      volcado_id: id,
      version: result.version,
      sha256: result.sha256,
      mensaje: "Version aprobada exitosamente y listo para ingesta"
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    let status = 500;
    if (errorMsg.includes("no encontrado") || errorMsg.includes("no existe") || errorMsg.includes("solicitada")) {
      status = 404;
    } else if (errorMsg.includes("Integridad") || errorMsg.includes("SHA256")) {
      status = 409;
    }
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
