import { fetchStoredObject } from "@/lib/server/object-storage";
// @l0 L0-002-R · @req FIX-DICTADO/D2-D8 · @req TRACE-SESSION/010
import { putEncryptedObject as put } from "@/lib/server/object-storage";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cifrarBytes, descifrarBytes } from "../../../lib/server/cripto";
import { registrarParteAudio } from "../../../lib/server/dictado";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }

    const forma = await req.formData();
    const archivo = forma.get("audio");
    if (!(archivo instanceof Blob)) {
      return NextResponse.json(
        { detail: "falta el archivo de audio" },
        { status: 400 },
      );
    }
    const crudo = Buffer.from(await archivo.arrayBuffer());
    if (!crudo.length) {
      return NextResponse.json(
        { detail: "el audio llego vacio" },
        { status: 400 },
      );
    }
    const sha256 = createHash("sha256").update(crudo).digest("hex");
    const cifrado = cifrarBytes(crudo);

    const sesionId = forma.get("sesionId");
    const parteStr = forma.get("parte");
    const fuenteAudioRaw = forma.get("fuenteAudio");
    const fuenteAudio = fuenteAudioRaw === "chrome_tab" ? "chrome_tab" : "microphone";
    const startMsRaw = forma.get("startMs");
    const endMsRaw = forma.get("endMs");
    const duracionMsRaw = forma.get("duracionMs");
    const startMs = typeof startMsRaw === "string" && Number.isFinite(Number(startMsRaw)) ? Number(startMsRaw) : undefined;
    const endMs = typeof endMsRaw === "string" && Number.isFinite(Number(endMsRaw)) ? Number(endMsRaw) : undefined;
    const duracionMs = typeof duracionMsRaw === "string" && Number.isFinite(Number(duracionMsRaw)) ? Number(duracionMsRaw) : undefined;

    const isSession =
      typeof sesionId === "string" && sesionId.trim().length > 0;
    const isParte = typeof parteStr === "string" && parteStr.trim().length > 0;

    if (!isSession || !isParte) {
      return NextResponse.json(
        { detail: "La carga de audio debe pertenecer a una sesión y parte explícitas." },
        { status: 400 },
      );
    }

    const partIndex = Number.parseInt(parteStr, 10);
    if (!Number.isInteger(partIndex) || partIndex < 1 || String(partIndex) !== String(parteStr).trim()) {
      return NextResponse.json(
        { detail: "Índice de parte inválido (debe ser un entero mayor o igual a 1)" },
        { status: 400 },
      );
    }

    await reclamarSesion(String(sesionId).trim(), session.user.email);
    const destino = "dictado/" + String(sesionId).trim() + "/" + partIndex + ".webm.khc";

    const subido = await put(destino, cifrado, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    // Tras escribir el blob, una falla de verificación lo deja en cuarentena:
    // se conserva el localizador, pero nunca se declara ni registra como verificado.
    try {
      const verificacion = await fetchStoredObject(subido.url, { cache: "no-store" });
      if (!verificacion.ok) {
        return NextResponse.json(
          {
            error: "audio_no_verificable",
            detail: `No se pudo releer el audio almacenado (HTTP ${verificacion.status}). El objeto se conserva para recuperación y no puede archivarse.`,
            sessionId: String(sesionId).trim(),
            partIndex,
            url: subido.url,
            blobPath: destino,
            bytes: crudo.length,
            sha256,
            fuenteAudio,
            verificado: false,
            recuperable: true,
          },
          { status: 502 },
        );
      }

      const almacenadoCifrado = Buffer.from(await verificacion.arrayBuffer());
      const almacenado = descifrarBytes(almacenadoCifrado);
      const shaVerificado = createHash("sha256").update(almacenado).digest("hex");

      if (almacenado.length !== crudo.length || shaVerificado !== sha256) {
        return NextResponse.json(
          {
            error: "audio_corrupto",
            detail: "La verificación post-escritura no coincide. El objeto se conserva para reconciliación, pero queda no verificado y no puede archivarse.",
            sessionId: String(sesionId).trim(),
            partIndex,
            url: subido.url,
            blobPath: destino,
            bytesEsperados: crudo.length,
            bytesRecuperados: almacenado.length,
            sha256Esperado: sha256,
            sha256Recuperado: shaVerificado,
            sha256,
            fuenteAudio,
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
          detail: `Falló la verificación post-escritura: ${String(verificationError)}. El blob se conserva en cuarentena recuperable y no puede archivarse.`,
          sessionId: String(sesionId).trim(),
          partIndex,
          url: subido.url,
          blobPath: destino,
          bytes: crudo.length,
          sha256,
          fuenteAudio,
          verificado: false,
          recuperable: true,
        },
        { status: 502 },
      );
    }

    try {
      await registrarParteAudio({
          sessionId: String(sesionId).trim(),
          partIndex,
          blobUrl: subido.url,
          blobPath: destino,
          bytes: crudo.length,
          sha256,
          fuenteAudio,
          estadoVerificacion: "verificado",
          startMs,
          endMs,
          duracionMs,
        });
      } catch (linkError) {
        // El objeto ya fue releído, descifrado y comparado. No borrarlo porque
        // una falla de vínculo no debe destruir el único original verificado.
        return NextResponse.json(
          {
            error: "audio_almacenado_no_vinculado",
            detail:
              "El audio cifrado se almacenó y verificó, pero falló el vínculo a la sesión. El objeto se conserva para recuperación; reintenta con el mismo sessionId/partIndex y no lo archives aún.",
            sessionId: String(sesionId).trim(),
            partIndex,
            url: subido.url,
            blobPath: destino,
            bytes: crudo.length,
            sha256,
            fuenteAudio,
            causa: linkError instanceof Error ? linkError.message : String(linkError),
            verificado: false,
            recuperable: true,
          },
          { status: 503 },
        );
      }

    return NextResponse.json({
      url: subido.url,
      bytes: crudo.length,
      cifrado: true,
      sha256,
      fuenteAudio,
      verificado: true,
    });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo guardar el audio", causa: String(e) },
      { status: 500 },
    );
  }
}
