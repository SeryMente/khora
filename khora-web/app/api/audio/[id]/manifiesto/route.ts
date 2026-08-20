// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import { COOKIE_BOVEDA, desbloqueoVigente } from "@/lib/server/boveda";
import { reportarIncidente } from "@/lib/server/incidentes";
import { esAudioEsperado } from "@/lib/server/domainAudio";
import { obtenerPalabrasTiming } from "@/lib/server/transcribir";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value)) {
      return NextResponse.json({ error: "boveda_cerrada", detail: "Bóveda cerrada: introduce el PIN" }, { status: 423 });
    }

    const { id } = await ctx.params;
    const isNumeric = /^\d+$/.test(id.trim());

    const db = getDb();
    const volcadoRes = await db.query(
      isNumeric
        ? "SELECT id, audio_url, audio_partes, session_id, duracion_seg, audio_bytes, fuente, driver, origen FROM volcado WHERE folio = $1"
        : "SELECT id, audio_url, audio_partes, session_id, duracion_seg, audio_bytes, fuente, driver, origen FROM volcado WHERE id::text = $1",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()]
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json({ error: "volcado_inexistente", detail: "El volcado no existe." }, { status: 404 });
    }

    const volcado = volcadoRes.rows[0];
    const volcadoId = volcado.id;
    const sessionId = volcado.session_id ? String(volcado.session_id).trim() : null;

    const audioEsperado = esAudioEsperado({
      fuente: volcado.fuente,
      driver: volcado.driver,
      origen: volcado.origen,
      session_id: sessionId,
    });

    // Buscar partes registradas en dictado_audio_parte
    let partesDb: any[] = [];
    if (sessionId || volcadoId) {
      const dbPartesRes = await db.query(
        `SELECT id, part_index, blob_url, blob_path, bytes, sha256, start_ms, end_ms, duracion_ms, estado_verificacion
         FROM dictado_audio_parte
         WHERE session_id = $1 OR volcado_id = $2
         ORDER BY part_index ASC`,
        [sessionId, volcadoId]
      );
      partesDb = dbPartesRes.rows;
    }

    let partesManifiesto: Array<{
      part_index: number;
      start_ms: number;
      end_ms: number;
      duracion_ms: number;
      bytes: number;
      sha256: string | null;
      verificado: boolean;
      download_path: string;
    }> = [];

    if (partesDb.length > 0) {
      let offsetMs = 0;
      partesManifiesto = partesDb.map((p, idx) => {
        const bytes = Number(p.bytes || 0);
        const durMs = p.duracion_ms ?? 45000;
        const startMs = p.start_ms ?? offsetMs;
        const endMs = p.end_ms ?? (startMs + durMs);
        offsetMs = endMs;

        return {
          part_index: p.part_index ?? (idx + 1),
          start_ms: startMs,
          end_ms: endMs,
          duracion_ms: durMs,
          bytes,
          sha256: p.sha256 ?? null,
          verificado: p.estado_verificacion === "verificado",
          download_path: `/api/audio/${volcadoId}/parte/${p.part_index ?? (idx + 1)}`,
        };
      });
    } else if (volcado.audio_partes) {
      let jsonPartes: any[] = [];
      try {
        jsonPartes = typeof volcado.audio_partes === "string" ? JSON.parse(volcado.audio_partes) : volcado.audio_partes;
      } catch {
        jsonPartes = [];
      }

      if (Array.isArray(jsonPartes) && jsonPartes.length > 0) {
        let offsetMs = 0;
        partesManifiesto = jsonPartes.map((p, idx) => {
          const bytes = Number(p.bytes || 0);
          const durMs = (p.duracion_seg ?? 45) * 1000;
          const startMs = offsetMs;
          const endMs = startMs + durMs;
          offsetMs = endMs;

          return {
            part_index: p.parte ?? (idx + 1),
            start_ms: startMs,
            end_ms: endMs,
            duracion_ms: durMs,
            bytes,
            sha256: p.sha256 ?? null,
            verificado: true,
            download_path: `/api/audio/${volcadoId}/parte/${p.parte ?? (idx + 1)}`,
          };
        });
      }
    } else if (volcado.audio_url) {
      const durMs = (volcado.duracion_seg ?? 45) * 1000;
      partesManifiesto = [
        {
          part_index: 1,
          start_ms: 0,
          end_ms: durMs,
          duracion_ms: durMs,
          bytes: Number(volcado.audio_bytes || 0),
          sha256: null,
          verificado: true,
          download_path: `/api/audio/${volcadoId}/parte/1`,
        },
      ];
    }

    if (partesManifiesto.length === 0) {
      if (!audioEsperado) {
        return NextResponse.json({
          volcado_id: volcadoId,
          session_id: sessionId,
          audio_expected: false,
          audio_status: "no_aplica",
          total_partes: 0,
          duracion_total_ms: 0,
          bytes_totales: 0,
          partes: [],
        });
      }

      await reportarIncidente({
        volcadoId,
        tipo: "audio_no_vinculado",
        severidad: "alta",
        origen: "manifiesto_audio",
        evidencia: { motivo: "No hay partes registradas de audio." },
      });

      return NextResponse.json(
        { error: "audio_no_vinculado", detail: "El volcado no posee audio disponible en el manifiesto." },
        { status: 404 }
      );
    }

    const duracionTotalMs = partesManifiesto.reduce((acc, p) => acc + p.duracion_ms, 0);
    const bytesTotales = partesManifiesto.reduce((acc, p) => acc + p.bytes, 0);

    // Detectar huecos en los índices de partes (ej. falta la parte 2 si existen 1 y 3) o bytes 0
    let tieneHuecos = false;
    for (let i = 0; i < partesManifiesto.length; i++) {
      if (partesManifiesto[i].part_index !== i + 1 || partesManifiesto[i].bytes <= 0) {
        tieneHuecos = true;
        break;
      }
    }

    const computedStatus = tieneHuecos ? "incompleto" : "disponible";

    // Obtener timing de palabras si existe
    let timing: any[] = [];
    try {
      const verRes = await db.query(
        "SELECT version FROM volcado_version WHERE volcado_id = $1 ORDER BY version DESC LIMIT 1",
        [volcadoId]
      );
      if (verRes.rows.length > 0) {
        timing = await obtenerPalabrasTiming(volcadoId, Number(verRes.rows[0].version));
      }
    } catch {
      timing = [];
    }

    return NextResponse.json({
      volcado_id: volcadoId,
      session_id: sessionId,
      audio_expected: true,
      audio_status: computedStatus,
      total_partes: partesManifiesto.length,
      duracion_total_ms: duracionTotalMs,
      bytes_totales: bytesTotales,
      partes: partesManifiesto,
      timing,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "error_interno", detail: String(err) }, { status: 500 });
  }
}
