import { fetchStoredObject } from "@/lib/server/object-storage";
import { NextResponse } from "next/server";
import { putEncryptedObject as put, deleteStagedObject, isStagingObject } from "@/lib/server/object-storage";
import { createHash } from "crypto";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { auth } from "@/auth";
import { cifrarBytes, descifrarBytes } from "@/lib/server/cripto";
import { registrarParteAudio } from "@/lib/server/dictado";
import {
  MAX_IMPORTED_AUDIO_BYTES,
  MAX_STAGED_AUDIO_BYTES,
  decryptStagedAudio,
  detectAudioFormat,
} from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let stagingUrl = "";
  let stagingCanBeDeleted = false;
  let cleanupSessionId = "";
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
      !isStagingObject(stagingUrl, sessionId)
    ) {
      return NextResponse.json(
        { detail: "Referencia temporal de audio inválida" },
        { status: 400 },
      );
    }

    await reclamarSesion(sessionId, session.user.email);
    cleanupSessionId = sessionId;
    const response = await fetchStoredObject(stagingUrl, { cache: "no-store" });
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

    // Si la lectura de control falla, conservar el objeto cifrado y la carga temporal.
    // La recuperación nunca se confunde con custodia verificada.
    try {
      const verifyResponse = await fetchStoredObject(stored.url, { cache: "no-store" });
      if (!verifyResponse.ok) {
        return NextResponse.json({
          error: "audio_no_verificable",
          detail: `No se pudo verificar la carga almacenada (HTTP ${verifyResponse.status}). Los objetos quedan conservados para recuperación; el audio no está verificado ni archivado.`,
          sessionId,
          audioUrl: stored.url,
          blobPath: destination,
          stagingUrl,
          audioBytes: clear.length,
          sha256,
          verificado: false,
          recuperable: true,
        }, { status: 502 });
      }
      const storedClear = descifrarBytes(Buffer.from(await verifyResponse.arrayBuffer()));
      const verifySha = createHash("sha256").update(storedClear).digest("hex");
      if (storedClear.length !== clear.length || verifySha !== sha256) {
        return NextResponse.json({
          error: "audio_corrupto",
          detail: "La verificación de almacenamiento no coincide con el archivo original. El objeto cifrado y la carga temporal se conservan para reconciliación; no se consideran verificados.",
          sessionId,
          audioUrl: stored.url,
          blobPath: destination,
          stagingUrl,
          audioBytes: clear.length,
          bytesRecuperados: storedClear.length,
          sha256,
          sha256Recuperado: verifySha,
          verificado: false,
          recuperable: true,
        }, { status: 502 });
      }
    } catch (verifyError) {
      return NextResponse.json({
        error: "audio_no_verificable",
        detail: `Falló la verificación del audio almacenado: ${String(verifyError)}. El objeto cifrado y la carga temporal se conservan para recuperación.`,
        sessionId,
        audioUrl: stored.url,
        blobPath: destination,
        stagingUrl,
        audioBytes: clear.length,
        sha256,
        verificado: false,
        recuperable: true,
      }, { status: 502 });
    }

    try {
      await registrarParteAudio({
        sessionId,
        partIndex: 1,
        blobUrl: stored.url,
        blobPath: destination,
        bytes: clear.length,
        sha256,
        fuenteAudio: "audio_archivo",
        nombreOriginal: originalName.trim() || "audio",
        mimeType: format.mimeType,
        estadoVerificacion: "verificado",
      });
    } catch (error) {
      // La copia cifrada ya se verificó contra el original. Si falla el vínculo,
      // mantener tanto el destino final como la carga temporal para recuperación.
      return NextResponse.json(
        {
          error: "audio_almacenado_no_vinculado",
          detail: "El audio importado se almacenó y verificó, pero no pudo vincularse a la sesión. El objeto cifrado se conserva para recuperación; no se considera archivado.",
          sessionId,
          audioUrl: stored.url,
          blobPath: destination,
          audioBytes: clear.length,
          sha256,
          causa: error instanceof Error ? error.message : String(error),
        },
        { status: 503 },
      );
    }

    stagingCanBeDeleted = true;
    return NextResponse.json({
      sessionId,
      audioUrl: stored.url,
      audioBytes: clear.length,
      sha256,
      mimeType: format.mimeType,
      originalName,
      estado: "audio_almacenado",
      verificado: true,
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
    if (stagingUrl && stagingCanBeDeleted) await deleteStagedObject(stagingUrl, cleanupSessionId).catch(() => undefined);
  }
}
