// @l0 L0-002-R · @req PIPELINE/REQ-3 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getDb } from "../../../../lib/server/neon";
import { asegurarEsquema } from "../../../../lib/server/correcciones";
import { asegurarGrafoEsquema } from "../../../../lib/server/grafo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await asegurarEsquema();
    await asegurarGrafoEsquema();
    const db = getDb();

    const sql = `
      SELECT
        v.id,
        v.titulo,
        v.recibido_en,
        v.estado,
        v.io_id,
        v.ultimo_error,
        v.audio_url,
        v.audio_bytes,
        v.duracion_seg,
        v.chars,
        r.version_aprobada,
        r.sha256_aprobado,
        r.aprobador,
        r.aprobado_en,
        COALESCE((SELECT COUNT(*)::int FROM volcado_version vv WHERE vv.volcado_id = v.id), 0) as total_versiones,
        COALESCE((SELECT MAX(vv.version)::int FROM volcado_version vv WHERE vv.volcado_id = v.id), 0) as version_actual,
        COALESCE((SELECT COUNT(*)::int FROM nodos n WHERE n.volcado_id = v.id), 0) as nodos_count,
        COALESCE((SELECT COUNT(*)::int FROM aristas a WHERE a.volcado_id = v.id), 0) as aristas_count
      FROM volcado v
      LEFT JOIN volcado_revision r ON v.id = r.volcado_id
      ORDER BY v.recibido_en DESC
    `;

    const res = await db.query(sql);
    const items = res.rows.map((v: any) => {
      // Determine integrity status
      let integrity = "sync";
      if (v.io_id && v.nodos_count === 0 && v.estado === "ingerido") {
        integrity = "broken_provenance";
      } else if (v.audio_url && v.audio_bytes && v.audio_bytes < 10240) {
        integrity = "audio_partial";
      } else if (v.audio_url && (!v.chars || v.chars === 0)) {
        integrity = "audio_without_text";
      } else if (!v.audio_url && v.chars > 0) {
        integrity = "text_without_audio";
      } else if (v.total_versiones > 1 || v.estado === "en_revision") {
        integrity = "text_edited";
      }

      // Format audio metadata
      let audioStatus = "sin_audio";
      if (v.audio_url) {
        if (integrity === "audio_partial") audioStatus = "audio_parcial";
        else if (integrity === "audio_without_text") audioStatus = "audio_sin_texto";
        else audioStatus = "audio_texto";
      } else {
        if (v.chars > 0) audioStatus = "texto_sin_audio";
      }

      return {
        id: v.id,
        titulo: v.titulo,
        recibido_en: v.recibido_en,
        estado: v.estado,
        io_id: v.io_id,
        ultimo_error: v.ultimo_error,
        chars: v.chars,
        audio_url: v.audio_url,
        audio_bytes: v.audio_bytes,
        duracion_seg: v.duracion_seg,
        version_aprobada: v.version_aprobada,
        sha256_aprobado: v.sha256_aprobado ? v.sha256_aprobado.trim() : null,
        aprobador: v.aprobador,
        aprobado_en: v.aprobado_en,
        total_versiones: v.total_versiones,
        version_actual: v.version_actual || 1,
        nodos_count: v.nodos_count,
        aristas_count: v.aristas_count,
        integrity,
        audioStatus
      };
    });

    // Compute aggregated counters
    const total = items.length;
    const archivado = items.filter(v => v.estado === "archivado").length;
    const en_revision = items.filter(v => v.estado === "en_revision").length;
    const listo_ingesta = items.filter(v => v.estado === "listo_ingesta").length;
    const ingerido = items.filter(v => v.estado === "ingerido").length;
    const fallido = items.filter(v => v.estado === "fallido").length;
    const pendiente_revision = items.filter(v => v.estado === "pendiente_revision").length;

    const anomalies = items.filter(v => v.integrity !== "sync").length;
    const sin_audio = items.filter(v => v.integrity === "text_without_audio").length;

    return NextResponse.json({
      items,
      resumen: {
        total,
        archivado,
        pendiente_revision,
        en_revision,
        listo_ingesta,
        ingerido,
        fallido,
        anomalies,
        sin_audio
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Error compiling pipeline data", details: e.message }, { status: 500 });
  }
}
