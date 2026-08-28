// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT · @req FIX-DICTADO/D12
import { NextResponse } from "next/server";
import {
  transcribirAudioConGroq,
  reconciliarTranscripcion,
  procesarChunksIncrementalesConTiempos,
  InputChunkData,
} from "../../../lib/server/transcribir";
import { evaluarCoberturaYReconciliar } from "../../../lib/transcripcion/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const forma = await req.formData();
      const archivos = forma.getAll("audio").filter((item): item is File => typeof item !== "string" && item instanceof Blob);
      const previewText = typeof forma.get("previewText") === "string" ? String(forma.get("previewText")) : "";
      const chunkMetaRaw = typeof forma.get("chunkMeta") === "string" ? String(forma.get("chunkMeta")) : "";

      let chunkMetaList: { part_index: number; start_ms: number; end_ms: number; session_id?: string }[] = [];
      if (chunkMetaRaw) {
        try {
          chunkMetaList = JSON.parse(chunkMetaRaw);
        } catch {
          // Fallback a derivación por índice si no es JSON válido
        }
      }

      if (archivos.length === 0) {
        return NextResponse.json({ detail: "falta el archivo de audio o las partes" }, { status: 400 });
      }

      if (archivos.length === 1) {
        const buffer = Buffer.from(await archivos[0].arrayBuffer());
        if (buffer.length === 0) {
          return NextResponse.json({ detail: "el audio llegó vacío" }, { status: 400 });
        }

        const res = await transcribirAudioConGroq(buffer, (archivos[0] as any).name || "dictado.webm", { verboseJson: true });
        if (!res.exito) {
          return NextResponse.json(
            {
              detail: res.motivo,
              exito: false,
              estadoTranscripcion: "fallido",
              partesFallidas: [1],
              modelo: res.modelo,
            },
            { status: 502 }
          );
        }

        const rec = reconciliarTranscripcion(previewText, res.texto);

        return NextResponse.json({
          exito: true,
          textoAutoritativo: res.texto,
          textoFinal: rec.textoFinal,
          reconciliado: rec.reconciliado,
          motivoReconciliacion: rec.motivo,
          perdidaDetectada: rec.perdidaDetectada ?? false,
          estadoTranscripcion: "completo",
          partesFallidas: [],
          modelo: res.modelo,
          segmentos: res.segmentos,
        });
      }

      // Múltiples partes / chunks de audio recibidos: procesamiento incremental con deduplicación de overlap
      const chunksData: InputChunkData[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const a = archivos[i];
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length > 0) {
          const meta = chunkMetaList.find((m) => m.part_index === i + 1) || {
            part_index: i + 1,
            start_ms: i * 45000,
            end_ms: (i + 1) * 45000,
          };
          chunksData.push({
            buffer: buf,
            part_index: meta.part_index,
            start_ms: meta.start_ms,
            end_ms: meta.end_ms,
            session_id: meta.session_id,
          });
        }
      }

      const resChunking = await procesarChunksIncrementalesConTiempos(chunksData);

      // Derivar estadoTranscripcion y partesFallidas
      const partesFallidas = resChunking.detallesChunks
        .filter((c) => c.estado === "pendiente_error")
        .map((c) => c.part_index);

      const estadoTranscripcion =
        resChunking.fallos === 0
          ? "completo"
          : resChunking.partesProcesadas > 0
          ? "parcial"
          : "fallido";

      // Limpiar marcadores de [transcripción pendiente en parte N] antes de reconciliar
      const textoAutoritativoLimpio = resChunking.textoAutoritativo
        .replace(/\[transcripción pendiente en parte \d+\]/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      // Reconciliar contra previewText con el guardián D12
      const evaluacion = evaluarCoberturaYReconciliar(previewText, textoAutoritativoLimpio);

      return NextResponse.json({
        exito: resChunking.exito,
        textoAutoritativo: resChunking.textoAutoritativo,
        textoFinal: evaluacion.textoResultado,
        reconciliado: evaluacion.aceptado,
        motivoReconciliacion: evaluacion.motivo,
        perdidaDetectada: evaluacion.perdidaDetectada,
        estadoTranscripcion,
        partesFallidas,
        partesProcesadas: resChunking.partesProcesadas,
        fallos: resChunking.fallos,
        detallesChunks: resChunking.detallesChunks,
        modelo: "whisper-large-v3",
      });
    }

    return NextResponse.json(
      { detail: "Formato de solicitud no soportado. Se requiere multipart/form-data con campo 'audio'." },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { detail: "Fallo la transcripción autoritativa con Groq Whisper", causa: String(e) },
      { status: 500 }
    );
  }
}
