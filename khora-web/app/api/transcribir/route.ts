// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import { NextResponse } from "next/server";
import { transcribirAudioConGroq, reconciliarTranscripcion } from "../../../lib/server/transcribir";

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
          return NextResponse.json({ detail: res.motivo, exito: false, modelo: res.modelo }, { status: 502 });
        }

        const rec = reconciliarTranscripcion(previewText, res.texto);

        return NextResponse.json({
          exito: true,
          textoAutoritativo: res.texto,
          textoFinal: rec.textoFinal,
          reconciliado: rec.reconciliado,
          motivoReconciliacion: rec.motivo,
          modelo: res.modelo,
          segmentos: res.segmentos,
        });
      }

      // Múltiples partes / chunks de audio recibidos: procesamiento incremental con deduplicación de overlap
      const buffers: Buffer[] = [];
      for (const a of archivos) {
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length > 0) buffers.push(buf);
      }

      const { procesarChunksIncrementales } = await import("../../../lib/server/transcribir");
      const resChunking = await procesarChunksIncrementales(buffers);

      if (!resChunking.exito) {
        return NextResponse.json(
          {
            detail: "Fallo la transcripción de las partes de audio",
            exito: false,
            detalles: resChunking.detallesFallos,
          },
          { status: 502 }
        );
      }

      const rec = reconciliarTranscripcion(previewText, resChunking.textoAutoritativo);

      return NextResponse.json({
        exito: true,
        textoAutoritativo: resChunking.textoAutoritativo,
        textoFinal: rec.textoFinal,
        reconciliado: rec.reconciliado,
        motivoReconciliacion: rec.motivo,
        partesProcesadas: resChunking.partesProcesadas,
        fallos: resChunking.fallos,
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
