// @l0 L0-002-R · @req FIX-DICTADO/D2-D8 · @req TRACE-SESSION/010
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cifrarBytes } from "../../../lib/server/cripto";
import { registrarParteAudio } from "../../../lib/server/dictado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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

    let destino: string;
    const isSession =
      typeof sesionId === "string" && sesionId.trim().length > 0;
    const isParte = typeof parteStr === "string" && parteStr.trim().length > 0;

    if (isSession && isParte) {
      destino = "dictado/" + sesionId + "/" + parteStr + ".webm.khc";
    } else {
      const marca = new Date().toISOString().replace(/[:.]/g, "-");
      destino = "dictado/" + marca + ".webm.khc";
    }

    const subido = await put(destino, cifrado, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
    });

    if (isSession && isParte) {
      const partIndex = parseInt(parteStr, 10);
      if (Number.isNaN(partIndex) || partIndex < 1) {
        return NextResponse.json(
          { detail: "Índice de parte inválido (debe ser mayor o igual a 1)" },
          { status: 400 },
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
        });
      } catch {
        return NextResponse.json(
          {
            error: "audio_almacenado_no_vinculado",
            detail:
              "El audio quedó almacenado, pero no pudo vincularse a la sesión. No se declarará guardado hasta reparar el vínculo.",
            sessionId: String(sesionId).trim(),
            partIndex,
            bytes: crudo.length,
            sha256,
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
    });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo guardar el audio", causa: String(e) },
      { status: 500 },
    );
  }
}
