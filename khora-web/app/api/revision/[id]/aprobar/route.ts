// @l0 L0-002-R · @req REVISION/REQ-1 · @req REVISION-COCKPIT/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { aprobarVersion } from "../../../../../lib/server/volcados";
import { evaluarCompuertaAprobacion } from "../../../../../lib/server/compuerta";

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

    const gateHashCliente = body?.gate_hash ? String(body.gate_hash).trim() : null;

    // Evaluacion server-side autoritativa de la compuerta de aprobacion
    const decision = await evaluarCompuertaAprobacion(id, session.user.email);

    if (!decision.canApprove) {
      return NextResponse.json(
        {
          error: "compuerta_bloqueada",
          detail: "La compuerta de aprobación tiene bloqueadores pendientes que impiden la autorización.",
          decision,
        },
        { status: 409 }
      );
    }

    if (gateHashCliente && decision.gate_hash !== gateHashCliente) {
      return NextResponse.json(
        {
          error: "gate_hash_obsoleto",
          detail: "El gate_hash presentado esta desactualizado debido a cambios recientes en el volcado.",
          decision,
        },
        { status: 409 }
      );
    }

    const result = await aprobarVersion(id, version, session.user.email);
    return NextResponse.json({
      success: true,
      volcado_id: id,
      version: result.version,
      sha256: result.sha256,
      gate_hash: decision.gate_hash,
      mensaje: "Versión aprobada exitosamente y listo para ingesta",
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    let status = 500;
    if (errorMsg.includes("no encontrado") || errorMsg.includes("no existe") || errorMsg.includes("solicitada")) {
      status = 404;
    } else if (errorMsg.includes("Integridad") || errorMsg.includes("SHA256") || errorMsg.includes("compuerta")) {
      status = 409;
    }
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
