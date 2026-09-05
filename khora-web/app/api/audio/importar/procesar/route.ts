import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { cifrarBytes } from "@/lib/server/cripto";
import { registrarParteAudio } from "@/lib/server/dictado";
import {
  MAX_IMPORTED_AUDIO_BYTES,
  MAX_STAGED_AUDIO_BYTES,
  decryptStagedAudio,
  detectAudioFormat,
  isKhoraStagingBlobUrl,
} from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let stagingUrl = "";
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    stagingUrl =
      typeof body?.stagingUrl === "string" ? body.stagingUrl.trim() : "";
    const keyBase64 = typeof body?.keyBase64 === "string" ? body.keyBase64 : "";
    const ivBase64 = typeof body?.ivBase64 === "string" ? body.ivBase64 : "";
    const originalName =
      typeof body?.originalName === "string" ? body.originalName : "audio";

    if (
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !isKhoraStagingBlobUrl(stagingUrl, sessionId)
    ) {
      return NextResponse.json(
        { detail: "Referencia temporal de audio inválida" },
        { status: 400 },
      );
    }

    const response = await fetch(stagingUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { detail: `Carga temporal inaccesible: HTTP ${response.status}` },
        { status: 502 },
      );
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_STAGED_AUDIO_BYTES) {
      return NextResponse.json(
        { detail: "La carga temporal supera el límite permitido" },
        { status: 413 },
      );
    }
    const encrypted = Buffer.from(await response.arrayBuffer());
    if (encrypted.length > MAX_STAGED_AUDIO_BYTES) {
      return NextResponse.json(
        { detail: "La carga temporal supera el límite permitido" },
        { status: 413 },
      );
    }

    const clear = decryptStagedAudio(encrypted, keyBase64, ivBase64);
    if (clear.length > MAX_IMPORTED_AUDIO_BYTES) {
      return NextResponse.json(
        { detail: "El audio supera el límite de 24 MB" },
        { status: 413 },
      );
    }
    const format = detectAudioFormat(clear);
    if (!format) {
      return NextResponse.json(
        { detail: "El archivo no contiene un formato de audio admitido" },
        { status: 415 },
      );
    }

    const sha256 = createHash("sha256").update(clear).digest("hex");
    const destination = `dictado/${sessionId}/1.${format.extension}.khc`;
    const stored = await put(destination, cifrarBytes(clear), {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    try {
      await registrarParteAudio({
        sessionId,
        partIndex: 1,
        blobUrl: stored.url,
        blobPath: destination,
        bytes: clear.length,
        sha256,
      });
    } catch (error) {
      await del(stored.url).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      sessionId,
      audioUrl: stored.url,
      audioBytes: clear.length,
      sha256,
      mimeType: format.mimeType,
      originalName,
      estado: "audio_almacenado",
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: "No se pudo custodiar el audio importado",
        causa: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    if (stagingUrl) await del(stagingUrl).catch(() => undefined);
  }
}
