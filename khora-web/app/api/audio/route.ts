// @l0 L0-002-R · @req FIX-DICTADO/D2-D8 · @req TRACE-SESSION/010
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cifrarBytes } from "../../../lib/server/cripto";
import { registrarParteAudio } from "../../../lib/server/dictado";
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

    let destino: string;
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

    if (isSession && isParte) {
      destino = "dictado/" + sesionId + "/" + partIndex + ".webm.khc";
    }

    const subido = await put(destino, cifrado, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    // Verificación post-escritura: recuperar el objeto recién almacenado,
    // descifrarlo y comparar bytes + SHA-256 antes de marcar la parte como verificada.
    try {
      const verificacion = await fetch(subido.url, { cache: "no-store" });
      if (!verificacion.ok) {
        await del(subido.url).catch(() => undefined);
        return NextResponse.json(
          { error: "audio_no_verificable", detail: `No se pudo releer el audio almacenado (HTTP ${verificacion.status}).` },
          { status: 502 },
        );
      }

      const almacenadoCifrado = Buffer.from(await verificacion.arrayBuffer());
      const almacenado = descifrarBytes(almacenadoCifrado);
      const shaVerificado = createHash("sha256").update(almacenado).digest("hex");

      if (almacenado.length !== crudo.length || shaVerificado !== sha256) {
        await del(subido.url).catch(() => undefined);
        return NextResponse.json(
          {
            error: "audio_corrupto",
            detail: "La verificación post-escritura no coincide con el audio recibido.",
            bytesEsperados: crudo.length,
            bytesRecuperados: almacenado.length,
            sha256Esperado: sha256,
            sha256Recuperado: shaVerificado,
          },
          { status: 502 },
        );
      }
    } catch (verificationError) {
      await del(subido.url).catch(() => undefined);
      return NextResponse.json(
        { error: "audio_no_verificable", detail: `Falló la verificación post-escritura: ${String(verificationError)}` },
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
      } catch {
        await del(subido.url).catch(() => undefined);
        return NextResponse.json(
          {
            error: "audio_almacenado_no_vinculado",
            detail:
              "El audio quedó almacenado, pero no pudo vincularse a la sesión. No se declarará guardado hasta reparar el vínculo.",
            sessionId: String(sesionId).trim(),
            partIndex,
            bytes: crudo.length,
            sha256,
            fuenteAudio,
          },
          { status: 503 },
        );
      }
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
