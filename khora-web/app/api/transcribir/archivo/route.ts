// @l0 L0-002-R · @req FIX-DICTADO/D14
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { createHash, randomUUID } from "crypto";
import { cifrarBytes, descifrarBytes } from "../../../../lib/server/cripto";
import { registrarParteAudio } from "../../../../lib/server/dictado";
import { detectAudioFormat } from "../../../../lib/server/importedAudio";
import { transcribirAudioConGroq } from "../../../../lib/server/transcribir";
import { evaluarCoberturaYReconciliar } from "../../../../lib/transcripcion/reconciliar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES_GROQ = 24 * 1024 * 1024; // ~24MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }
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
    const format = detectAudioFormat(crudo);
    if (!format) {
      return NextResponse.json(
        { detail: "El archivo no contiene un formato de audio admitido" },
        { status: 415 },
      );
    }
    const nombreArchivo =
      typeof (archivo as File).name === "string" && (archivo as File).name.trim()
        ? (archivo as File).name.trim()
        : "audio-adjunto." + format.extension;
    const sha256 = createHash("sha256").update(crudo).digest("hex");
    const cifrado = cifrarBytes(crudo);
    const destino = `dictado/${sessionId}/1.${format.extension}.khc`;

    const subido = await put(destino, cifrado, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    // La parte adjunta no se marca custodiada hasta releer, descifrar y verificarla.
    try {
      const verificacion = await fetch(subido.url, { cache: "no-store" });
      if (!verificacion.ok) {
        return NextResponse.json(
          {
            error: "audio_no_verificable",
            detail: `No se pudo releer la carga almacenada (HTTP ${verificacion.status}). El blob se conserva para recuperación, pero no está verificado.`,
            sessionId,
            audioUrl: subido.url,
            blobPath: destino,
            audioBytes: crudo.length,
            sha256,
            verificado: false,
            recuperable: true,
          },
          { status: 502 },
        );
      }
      const bytesAlmacenados = descifrarBytes(Buffer.from(await verificacion.arrayBuffer()));
      const shaAlmacenado = createHash("sha256").update(bytesAlmacenados).digest("hex");
      if (bytesAlmacenados.length !== crudo.length || shaAlmacenado !== sha256) {
        return NextResponse.json(
          {
            error: "audio_corrupto",
            detail: "La copia almacenada no coincide con el archivo original. Se conserva para reconciliación; no está verificada ni puede archivarse.",
            sessionId,
            audioUrl: subido.url,
            blobPath: destino,
            audioBytes: crudo.length,
            bytesRecuperados: bytesAlmacenados.length,
            sha256,
            sha256Recuperado: shaAlmacenado,
            verificado: false,
            recuperable: true,
          },
          { status: 502 },
        );
      }
    } catch (verificationError) {
      return NextResponse.json(
        {
          error: "audio_no_verificable",
          detail: `Falló la verificación de almacenamiento: ${String(verificationError)}. El blob se conserva para recuperación y no se considera custodiado.`,
          sessionId,
          audioUrl: subido.url,
          blobPath: destino,
          audioBytes: crudo.length,
          sha256,
          verificado: false,
          recuperable: true,
        },
        { status: 502 },
      );
    }

    try {
      await registrarParteAudio({
        sessionId,
        partIndex: 1,
        blobUrl: subido.url,
        blobPath: destino,
        bytes: crudo.length,
        sha256,
        fuenteAudio: "audio_archivo",
        nombreOriginal: nombreArchivo,
        mimeType: format.mimeType,
        estadoVerificacion: "verificado",
      });
    } catch {
      return NextResponse.json(
        {
          error: "audio_almacenado_no_vinculado",
          detail:
            "El audio adjunto quedó almacenado, pero no pudo vincularse a la sesión. No se continuará a transcripción.",
          sessionId,
          audioUrl: subido.url,
          blobPath: destino,
          audioBytes: crudo.length,
          sha256,
          recuperable: true,
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
        originalName: nombreArchivo,
        mimeType: format.mimeType,
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
      originalName: nombreArchivo,
      mimeType: format.mimeType,
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
