// @l0 L0-002-R · @req FIX-DICTADO/D14
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createHash, randomUUID } from "crypto";
import { cifrarBytes } from "../../../../lib/server/cripto";
import { registrarParteAudio } from "../../../../lib/server/dictado";
import { transcribirAudioConGroq } from "../../../../lib/server/transcribir";
import { evaluarCoberturaYReconciliar } from "../../../../lib/transcripcion/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES_GROQ = 24 * 1024 * 1024; // ~24MB

export async function POST(req: NextRequest) {
  try {
    const forma = await req.formData();
    const archivo = forma.get("audio");
    const previewText =
      typeof forma.get("previewText") === "string"
        ? String(forma.get("previewText"))
        : "";
    let sessionId =
      typeof forma.get("sessionId") === "string"
        ? String(forma.get("sessionId")).trim()
        : "";

    if (!sessionId) {
      sessionId = randomUUID();
    }

    if (!(archivo instanceof Blob)) {
      return NextResponse.json(
        { detail: "Falta el archivo de audio" },
        { status: 400 },
      );
    }

    const crudo = Buffer.from(await archivo.arrayBuffer());
    if (crudo.length === 0) {
      return NextResponse.json(
        { detail: "El archivo de audio llegó vacío" },
        { status: 400 },
      );
    }

    // 1. Persistir el archivo CIFRADO como parte 1 de la sesión (igual patrón que /api/audio)
    const sha256 = createHash("sha256").update(crudo).digest("hex");
    const cifrado = cifrarBytes(crudo);
    const destino = `dictado/${sessionId}/1.webm.khc`;

    const subido = await put(destino, cifrado, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    try {
      await registrarParteAudio({
        sessionId,
        partIndex: 1,
        blobUrl: subido.url,
        blobPath: destino,
        bytes: crudo.length,
        sha256,
      });
    } catch {
      return NextResponse.json(
        {
          error: "audio_almacenado_no_vinculado",
          detail:
            "El audio adjunto quedó almacenado, pero no pudo vincularse a la sesión. No se continuará a transcripción.",
          sessionId,
          audioBytes: crudo.length,
          sha256,
        },
        { status: 503 },
      );
    }

    // 2. Si bytes > ~24MB: guardar y responder exito:false, estadoTranscripcion:"fallido"
    if (crudo.length > MAX_BYTES_GROQ) {
      return NextResponse.json({
        exito: false,
        estadoTranscripcion: "fallido",
        partesFallidas: [1],
        sessionId,
        audioUrl: subido.url,
        audioBytes: crudo.length,
        detail:
          "El archivo excede ~24MB. Se guardó el audio. Usa 'Re-transcribir audio' para procesarlo.",
      });
    }

    // 3. Transcribir con Groq Whisper y reconciliar con el guardián D12
    const nombreArchivo = (archivo as any).name || "audio-adjunto.webm";
    const resGroq = await transcribirAudioConGroq(crudo, nombreArchivo, {
      verboseJson: true,
    });

    if (!resGroq.exito) {
      return NextResponse.json({
        exito: false,
        estadoTranscripcion: "fallido",
        partesFallidas: [1],
        sessionId,
        audioUrl: subido.url,
        audioBytes: crudo.length,
        detail: resGroq.motivo || "Fallo la transcripción con Groq Whisper",
      });
    }

    const evaluacion = evaluarCoberturaYReconciliar(previewText, resGroq.texto);

    return NextResponse.json({
      exito: true,
      textoAutoritativo: resGroq.texto,
      textoFinal: evaluacion.textoResultado,
      reconciliado: evaluacion.aceptado,
      motivoReconciliacion: evaluacion.motivo,
      perdidaDetectada: evaluacion.perdidaDetectada,
      estadoTranscripcion: "completo",
      partesFallidas: [],
      sessionId,
      audioUrl: subido.url,
      audioBytes: crudo.length,
      modelo: resGroq.modelo,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        detail: "Fallo al procesar el archivo de audio adjunto",
        causa: String(e?.message ?? e),
      },
      { status: 500 },
    );
  }
}
