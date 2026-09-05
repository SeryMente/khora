// @l0 L0-002-R · @req FIX-DICTADO/D13
import { getDb } from "./neon";
import { descifrarBytes } from "./cripto";
import {
  transcribirAudioConGroq,
  unirDosTranscriptsConOverlapTemporal,
  IntervaloTemporal,
} from "./transcribir";
import { evaluarCoberturaYReconciliar } from "../transcripcion/reconciliar";

export interface OpcionesTranscribirSesion {
  sessionId?: string | null;
  volcadoId?: string | null;
  previewText?: string | null;
}

export interface ResultadoTranscribirSesion {
  exito: boolean;
  textoAutoritativo: string;
  textoFinal: string;
  estadoTranscripcion: "completo" | "parcial" | "fallido";
  partesFallidas: number[];
  partesProcesadas: number;
  totalPartes: number;
  perdidaDetectada: boolean;
  motivoReconciliacion: string;
}

interface ParteAudioDB {
  part_index: number;
  blob_url: string;
  blob_path?: string | null;
  start_ms?: number | null;
  end_ms?: number | null;
}

export async function transcribirSesion(
  opciones: OpcionesTranscribirSesion
): Promise<ResultadoTranscribirSesion> {
  const db = getDb();
  const sessionId = opciones.sessionId?.trim() || null;
  const volcadoId = opciones.volcadoId?.trim() || null;
  const previewText = opciones.previewText?.trim() || "";

  if (!sessionId && !volcadoId) {
    throw new Error("Se requiere sessionId o volcadoId para re-transcribir la sesión");
  }

  // 1. Resolver partes desde dictado_audio_parte (ORDER BY part_index)
  let partes: ParteAudioDB[] = [];

  if (sessionId) {
    const res = await db.query(
      `SELECT part_index, blob_url, blob_path, start_ms, end_ms
       FROM dictado_audio_parte
       WHERE session_id = $1
       ORDER BY part_index ASC`,
      [sessionId]
    );
    partes = res.rows.map((r) => ({
      part_index: Number(r.part_index),
      blob_url: String(r.blob_url),
      blob_path: r.blob_path ? String(r.blob_path) : null,
      start_ms: r.start_ms !== null ? Number(r.start_ms) : null,
      end_ms: r.end_ms !== null ? Number(r.end_ms) : null,
    }));
  }

  if (partes.length === 0 && volcadoId) {
    const resV = await db.query(
      `SELECT audio_partes, audio_url, session_id FROM volcado WHERE id = $1`,
      [volcadoId]
    );
    if (resV.rows.length > 0) {
      const v = resV.rows[0];
      const audioPartesRaw = v.audio_partes;
      const audioUrlRaw = v.audio_url;

      if (Array.isArray(audioPartesRaw) && audioPartesRaw.length > 0) {
        partes = audioPartesRaw.map((p: any) => ({
          part_index: Number(p.parte || p.part_index || 1),
          blob_url: String(p.url || p.blob_url),
          start_ms: p.start_ms ? Number(p.start_ms) : null,
          end_ms: p.end_ms ? Number(p.end_ms) : null,
        }));
      } else if (audioUrlRaw) {
        partes = [{ part_index: 1, blob_url: String(audioUrlRaw) }];
      }
    }
  }

  if (partes.length === 0) {
    return {
      exito: false,
      textoAutoritativo: "",
      textoFinal: previewText,
      estadoTranscripcion: "fallido",
      partesFallidas: [],
      partesProcesadas: 0,
      totalPartes: 0,
      perdidaDetectada: false,
      motivoReconciliacion: "No se encontraron partes de audio para la sesión o volcado especificado.",
    };
  }

  // 2. Transcribir cada parte recuperando blob -> descifrarBytes -> transcribirAudioConGroq
  const partesExitosas: { partIndex: number; texto: string; intervalo: IntervaloTemporal }[] = [];
  const partesFallidas: number[] = [];

  for (const parte of partes) {
    try {
      const respBlob = await fetch(parte.blob_url);
      if (!respBlob.ok) {
        partesFallidas.push(parte.part_index);
        continue;
      }

      const bufferCifrado = Buffer.from(await respBlob.arrayBuffer());
      const bufferDescifrado = descifrarBytes(bufferCifrado);

      if (bufferDescifrado.length === 0) {
        partesFallidas.push(parte.part_index);
        continue;
      }

      const extension = parte.blob_path?.match(/\.([a-z0-9]+)\.khc$/i)?.[1] || "webm";
      const resGroq = await transcribirAudioConGroq(
        bufferDescifrado,
        `dictado-parte-${parte.part_index}.${extension}`,
        { verboseJson: true }
      );

      if (resGroq.exito && resGroq.texto.trim().length > 0) {
        const startMs = parte.start_ms ?? (parte.part_index - 1) * 45000;
        const endMs = parte.end_ms ?? parte.part_index * 45000;
        partesExitosas.push({
          partIndex: parte.part_index,
          texto: resGroq.texto.trim(),
          intervalo: { start_ms: startMs, end_ms: endMs },
        });
      } else {
        partesFallidas.push(parte.part_index);
      }
    } catch {
      partesFallidas.push(parte.part_index);
    }
  }

  // 3. Fundir SOLO las partes exitosas con unirDosTranscriptsConOverlapTemporal (sin marcadores de relleno)
  let textoAutoritativo = "";
  for (let i = 0; i < partesExitosas.length; i++) {
    const item = partesExitosas[i];
    if (i === 0) {
      textoAutoritativo = item.texto;
    } else {
      const prev = partesExitosas[i - 1];
      textoAutoritativo = unirDosTranscriptsConOverlapTemporal(
        textoAutoritativo,
        item.texto,
        prev.intervalo,
        item.intervalo
      );
    }
  }

  // 4. Derivar estadoTranscripcion + Reconciliar contra previewText con el guardián D12
  const totalPartes = partes.length;
  const partesProcesadas = partesExitosas.length;
  const fallos = partesFallidas.length;

  const estadoTranscripcion: "completo" | "parcial" | "fallido" =
    fallos === 0
      ? "completo"
      : partesProcesadas > 0
      ? "parcial"
      : "fallido";

  const evaluacion = evaluarCoberturaYReconciliar(previewText, textoAutoritativo);

  return {
    exito: partesProcesadas > 0,
    textoAutoritativo,
    textoFinal: evaluacion.textoResultado,
    estadoTranscripcion,
    partesFallidas,
    partesProcesadas,
    totalPartes,
    perdidaDetectada: evaluacion.perdidaDetectada,
    motivoReconciliacion: evaluacion.motivo,
  };
}
