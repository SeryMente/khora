// @l0 L0-002-R · @req PROMPT-3A/PROPUESTAS
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { aplicarPropuestasCorreccion } from "../../../../../../lib/server/propuestasCorreccion";

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

    const propuestaIds: string[] = Array.isArray(body?.propuesta_ids)
      ? body.propuesta_ids
      : Array.isArray(body?.propuestaIds)
      ? body.propuestaIds
      : [];

    if (propuestaIds.length === 0) {
      return NextResponse.json({ detail: "propuesta_ids vacio o invalido" }, { status: 400 });
    }

    const resultado = await aplicarPropuestasCorreccion(id, propuestaIds, {
      actor: session.user.email,
    });

    if (!resultado.exito) {
      return NextResponse.json(
        { detail: resultado.motivo ?? "Error al aplicar propuestas" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      volcado_id: id,
      nueva_version: resultado.nuevaVersion,
      nuevo_sha256: resultado.nuevoSha256,
      propuestas_aplicadas: resultado.propuestasAplicadas,
      mensaje: "Propuestas aceptadas y aplicadas creando nueva versión exitosamente",
    });
  } catch (e: any) {
    const errorMsg = String(e?.message ?? e);
    const status = errorMsg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ detail: errorMsg }, { status });
  }
}
