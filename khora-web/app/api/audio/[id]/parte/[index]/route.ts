// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "@/lib/server/neon";
import { descifrarBytes } from "@/lib/server/cripto";
import { COOKIE_BOVEDA, desbloqueoVigente } from "@/lib/server/boveda";
import { reportarIncidente } from "@/lib/server/incidentes";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; index: string }> },
) {
  try {
    if (!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value)) {
      return NextResponse.json(
        { error: "boveda_cerrada", detail: "Bóveda cerrada: introduce el PIN" },
        { status: 423 },
      );
    }

    const { id, index } = await ctx.params;
    const partIndex = parseInt(index, 10);
    if (isNaN(partIndex) || partIndex < 0) {
      return NextResponse.json(
        { error: "parametro_invalido", detail: "Índice de parte inválido" },
        { status: 400 },
      );
    }

    const isNumeric = /^\d+$/.test(id.trim());
    const db = getDb();
    const volcadoRes = await db.query(
      isNumeric
        ? "SELECT id, audio_url, audio_partes, session_id FROM volcado WHERE folio = $1"
        : "SELECT id, audio_url, audio_partes, session_id FROM volcado WHERE id::text = $1",
      [isNumeric ? parseInt(id.trim(), 10) : id.trim()],
    );

    if (volcadoRes.rows.length === 0) {
      return NextResponse.json(
        {
          error: "volcado_inexistente",
          detail: "El volcado especificado no existe.",
        },
        { status: 404 },
      );
    }

    const volcado = volcadoRes.rows[0];
    const volcadoId = volcado.id;
    const sessionId = volcado.session_id
      ? String(volcado.session_id).trim()
      : null;

    let blobUrl = "";
    let sha256Esperado: string | null = null;

    // 1. Resolver por dictado_audio_parte
    if (sessionId || volcadoId) {
      const parteRes = await db.query(
        `SELECT blob_url, sha256 FROM dictado_audio_parte
         WHERE (session_id = $1 OR volcado_id = $2) AND part_index = $3`,
        [sessionId, volcadoId, partIndex],
      );
      if (parteRes.rows.length > 0) {
        blobUrl = parteRes.rows[0].blob_url;
        sha256Esperado = parteRes.rows[0].sha256;
      }
    }

    // 2. Resolver por audio_partes JSON
    if (!blobUrl && volcado.audio_partes) {
      try {
        const jsonPartes =
          typeof volcado.audio_partes === "string"
            ? JSON.parse(volcado.audio_partes)
            : volcado.audio_partes;
        if (Array.isArray(jsonPartes)) {
          const p = jsonPartes.find((item) => (item.parte ?? 1) === partIndex);
          if (p && p.url) {
            blobUrl = p.url;
            sha256Esperado = p.sha256 ?? null;
          }
        }
      } catch {
        // Ignorar error de parseo
      }
    }

    // 3. Fallback a audio_url para parte 1
    if (!blobUrl && partIndex === 1 && volcado.audio_url) {
      blobUrl = String(volcado.audio_url).trim();
    }

    if (!blobUrl) {
      await reportarIncidente({
        volcadoId,
        tipo: "audio_parcial",
        severidad: "alta",
        origen: "reproducir_parte",
        evidencia: { parte_solicitada: partIndex },
      });
      return NextResponse.json(
        {
          error: "parte_inexistente",
          detail: `Parte ${partIndex} de audio no encontrada.`,
        },
        { status: 404 },
      );
    }

    // Descargar blob
    let remoto: Response;
    try {
      remoto = await fetch(blobUrl, { cache: "no-store" });
    } catch (err: any) {
      await reportarIncidente({
        volcadoId,
        tipo: "blob_inaccesible",
        severidad: "alta",
        origen: "reproducir_parte",
        evidencia: { url: blobUrl, error: String(err) },
      });
      return NextResponse.json(
        { error: "blob_inaccesible", detail: `Blob inaccesible: ${blobUrl}` },
        { status: 502 },
      );
    }

    if (!remoto.ok) {
      await reportarIncidente({
        volcadoId,
        tipo: "blob_inaccesible",
        severidad: "alta",
        origen: "reproducir_parte",
        evidencia: { url: blobUrl, status: remoto.status },
      });
      return NextResponse.json(
        {
          error: "blob_inaccesible",
          detail: `Blob respondió con status ${remoto.status}`,
        },
        { status: 502 },
      );
    }

    const cifrado = Buffer.from(await remoto.arrayBuffer());
    let claro: Buffer;
    try {
      claro = descifrarBytes(cifrado);
    } catch {
      await reportarIncidente({
        volcadoId,
        tipo: "checksum_audio_invalido",
        severidad: "alta",
        origen: "reproducir_parte",
        evidencia: { motivo: "Error al descifrar el blob." },
      });
      return NextResponse.json(
        {
          error: "blob_corrupto",
          detail: "No se pudo descifrar el blob de audio.",
        },
        { status: 500 },
      );
    }

    if (sha256Esperado) {
      const hashCalculado = createHash("sha256").update(claro).digest("hex");
      if (hashCalculado !== sha256Esperado) {
        await reportarIncidente({
          volcadoId,
          tipo: "checksum_audio_invalido",
          severidad: "alta",
          origen: "reproducir_parte",
          evidencia: {
            parte: partIndex,
            calculado: hashCalculado,
            esperado: sha256Esperado,
          },
        });
        return NextResponse.json(
          {
            error: "checksum_audio_invalido",
            detail: `Fallo de verificación SHA256 en parte ${partIndex}`,
          },
          { status: 500 },
        );
      }
    }

    const totalBytes = claro.length;
    const rangeHeader = req.headers.get("range");

    if (!rangeHeader) {
      return new NextResponse(new Uint8Array(claro), {
        status: 200,
        headers: {
          "content-type": "audio/webm",
          "accept-ranges": "bytes",
          "content-length": String(totalBytes),
          "cache-control": "no-store",
        },
      });
    }

    // Petición HTTP Range
    const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (!match) {
      return new NextResponse("Rango no satisfacible", {
        status: 416,
        headers: {
          "content-range": `bytes */${totalBytes}`,
        },
      });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalBytes - 1;

    if (start >= totalBytes || end >= totalBytes || start > end) {
      return new NextResponse("Rango no satisfacible", {
        status: 416,
        headers: {
          "content-range": `bytes */${totalBytes}`,
        },
      });
    }

    const chunk = claro.subarray(start, end + 1);
    const contentLength = chunk.length;

    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "content-type": "audio/webm",
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${totalBytes}`,
        "content-length": String(contentLength),
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "error_interno", detail: String(err) },
      { status: 500 },
    );
  }
}
