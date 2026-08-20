// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { resolverIncidente } from "@/lib/server/incidentes";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; incId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id, incId } = await ctx.params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const db = getDb();
    const isNumeric = /^\d+$/.test(id.trim());

    const volcadoRes = await db.query(
      isNumeric
        ? "SELECT id, audio_url, session_id, audio_partes FROM volcado WHERE folio = $1"
        : "SELECT id, audio_url, session_id, audio_partes FROM volcado WHERE id::text = $1",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()]
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json({ detail: "Volcado no encontrado" }, { status: 404 });
    }

    const realVolcadoId = volcadoRes.rows[0].id;

    // Verify incident belongs to this volcado
    const incRes = await db.query(
      "SELECT id, volcado_id, tipo FROM volcado_incidente WHERE id = $1",
      [incId]
    );

    if (incRes.rows.length === 0) {
      return NextResponse.json({ detail: "Incidente no encontrado" }, { status: 404 });
    }

    if (incRes.rows[0].volcado_id !== realVolcadoId) {
      return NextResponse.json(
        { detail: "El incidente indicado no pertenece al volcado de la ruta." },
        { status: 409 }
      );
    }

    const codigoResolucion = String(body?.codigoResolucion || "falso_positivo");

    // Check if audio_recuperado requires audio verification
    if (codigoResolucion === "audio_recuperado") {
      const v = volcadoRes.rows[0];
      const sessionId = v.session_id ? String(v.session_id).trim() : null;
      let valid = false;

      const pRes = await db.query(
        "SELECT bytes FROM dictado_audio_parte WHERE session_id = $1 OR volcado_id = $2",
        [sessionId, realVolcadoId]
      );
      if (pRes.rows.length > 0) {
        const hasValidBytes = pRes.rows.every((row: any) => Number(row.bytes || 0) > 0);
        if (hasValidBytes) valid = true;
      } else if (v.audio_partes) {
        try {
          const jsonPartes = typeof v.audio_partes === "string" ? JSON.parse(v.audio_partes) : v.audio_partes;
          if (Array.isArray(jsonPartes) && jsonPartes.length > 0 && jsonPartes.every((p: any) => Number(p.bytes || 0) > 0)) {
            valid = true;
          }
        } catch {}
      } else if (v.audio_url) {
        valid = true;
      }

      if (!valid) {
        return NextResponse.json(
          { detail: "No se puede resolver como 'audio_recuperado': el manifiesto y los bytes de audio no son válidos." },
          { status: 422 }
        );
      }
    }

    const inc = await resolverIncidente({
      incidenteId: incId,
      usuario: session.user.email,
      codigoResolucion,
      evidenciaResolucion: body?.evidencia,
    });

    return NextResponse.json({ success: true, incidente: inc });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message ?? e) }, { status: 500 });
  }
}
