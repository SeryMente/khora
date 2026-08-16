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
      const archivo = forma.get("audio");
      const previewText = typeof forma.get("previewText") === "string" ? String(forma.get("previewText")) : "";

      if (!(archivo instanceof Blob)) {
        return NextResponse.json({ detail: "falta el archivo de audio" }, { status: 400 });
      }

      const buffer = Buffer.from(await archivo.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json({ detail: "el audio llegó vacío" }, { status: 400 });
      }

      const res = await transcribirAudioConGroq(buffer, archivo.name || "dictado.webm");
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
