// @l0 L0-002-R · @req REVISION/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getDb } from "../../../../lib/server/neon";
import { descifrarTexto } from "../../../../lib/server/cripto";
import { asegurarEsquema } from "../../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    await asegurarEsquema();
    const db = getDb();

    const r = await db.query("SELECT * FROM volcado WHERE id = $1", [id]);
    if (r.rows.length === 0) {
      return NextResponse.json({ detail: "volcado no encontrado" }, { status: 404 });
    }
    const volcado: any = r.rows[0];

    // Obtener versiones
    const versRes = await db.query(
      "SELECT version, texto, sha256, chars, motivo, creado_en FROM volcado_version WHERE volcado_id = $1 ORDER BY version ASC",
      [id]
    );
    const versiones = versRes.rows.map((v: any) => ({
      ...v,
      texto: descifrarTexto(String(v.texto ?? ""))
    }));

    // Obtener historial de auditoría
    const audRes = await db.query(
      "SELECT id, accion, estado_anterior, estado_nuevo, version, sha256, usuario, created_at FROM volcado_revision_auditoria WHERE volcado_id = $1 ORDER BY created_at DESC",
      [id]
    );
    const historial = audRes.rows;

    // Obtener deltas/correcciones
    const corrRes = await db.query(
      "SELECT antes, despues, version_desde, version_hasta, creado_en FROM correccion WHERE volcado_id = $1 ORDER BY creado_en ASC",
      [id]
    );
    const deltas = corrRes.rows;

    const vOriginal = versiones.find((v: any) => Number(v.version) === 1) || null;
    const vActual = versiones.length > 0 ? versiones[versiones.length - 1] : null;

    // Validar integridad
    const audio_present = !!volcado.audio_url;
    const transcription_present = versiones.length > 0 || !!volcado.texto;
    const audio_complete = audio_present ? "unknown" : false;
    const has_edits = versiones.length > 1 || Number(volcado.ediciones ?? 0) > 0;
    const has_approved_version = volcado.version_aprobada !== null;

    const respuesta = {
      estado: volcado.estado,
      version_original: vOriginal,
      version_actual: vActual,
      version_aprobada: volcado.version_aprobada,
      sha256_aprobado: volcado.sha256_aprobado,
      aprobado_en: volcado.aprobado_en,
      aprobador: volcado.aprobador,
      historial,
      deltas,
      audio: {
        url: volcado.audio_url || null,
        bytes: volcado.audio_bytes || null,
        duracion_seg: volcado.duracion_seg || null
      },
      integridad: {
        audio_present,
        transcription_present,
        audio_complete,
        has_edits,
        has_approved_version
      }
    };

    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo leer el estado de revision", causa: String(e) }, { status: 500 });
  }
}
