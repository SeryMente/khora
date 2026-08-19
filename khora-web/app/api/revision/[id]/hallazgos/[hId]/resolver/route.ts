// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { resolverHallazgo, EstadoHallazgo } from "@/lib/server/asistenteRevision";
import { guardarEdicion } from "@/lib/server/correcciones";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; hId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id, hId } = await ctx.params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const accion = String(body?.accion || "aceptar"); // aceptar | rechazar
    const estadoNuevo: EstadoHallazgo = accion === "aceptar" ? "aceptada" : "rechazada";

    const db = getDb();
    const isNumeric = /^\d+$/.test(id.trim());

    const volcadoRes = await db.query(
      isNumeric
        ? "SELECT id, texto FROM volcado WHERE folio = $1"
        : "SELECT id, texto FROM volcado WHERE id::text = $1",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()]
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json({ detail: "Volcado no encontrado" }, { status: 404 });
    }

    const realVolcadoId = volcadoRes.rows[0].id;

    // Verificar el hallazgo y que pertenezca al volcado
    const hallazgoRes = await db.query(
      "SELECT id, volcado_id, version, char_inicio, char_fin, texto_original, sugerencia FROM volcado_hallazgo WHERE id = $1",
      [hId]
    );

    if (hallazgoRes.rows.length === 0) {
      return NextResponse.json({ detail: "Hallazgo no encontrado" }, { status: 404 });
    }

    const h = hallazgoRes.rows[0];
    if (h.volcado_id !== realVolcadoId) {
      return NextResponse.json({ detail: "El hallazgo no pertenece al volcado" }, { status: 409 });
    }

    const resolved = await resolverHallazgo({
      hallazgoId: hId,
      estado: estadoNuevo,
      usuario: session.user.email,
      codigoResolucion: body?.codigoResolucion ?? null,
    });

    // Si se acepta el hallazgo, aplicar la sustitución exacta al texto del volcado si aún coincide
    if (accion === "aceptar" && h.sugerencia) {
      const textoActual = volcadoRes.rows[0].texto || "";
      const posInicio = Number(h.char_inicio);
      const posFin = Number(h.char_fin);
      const sub = textoActual.slice(posInicio, posFin);

      if (sub === h.texto_original) {
        const textoNuevo = textoActual.slice(0, posInicio) + h.sugerencia + textoActual.slice(posFin);
        await guardarEdicion(realVolcadoId, textoNuevo, session.user.email);
      }
    }

    return NextResponse.json({ success: true, hallazgo: resolved });
  } catch (err: any) {
    return NextResponse.json({ detail: String(err?.message ?? err) }, { status: 500 });
  }
}
