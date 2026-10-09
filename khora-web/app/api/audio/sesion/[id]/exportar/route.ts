// @l0 L0-002-R · @req L0-003/CUSTODIA · @req ING-EXPORT-ORIGINAL
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { COOKIE_BOVEDA, desbloqueoVigente } from "@/lib/server/boveda";
import { descifrarBytes } from "@/lib/server/cripto";
import { asegurarColumnasDictado } from "@/lib/server/dictado";
import { getDb } from "@/lib/server/neon";
import { evaluarCustodiaAudio } from "@/lib/audio/custodia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized", detail: "No autenticado." }, { status: 401 });
    }
    if (!desbloqueoVigente(request.cookies.get(COOKIE_BOVEDA)?.value)) {
      return NextResponse.json({ error: "boveda_cerrada", detail: "Bóveda cerrada: desbloquéala para exportar el audio original." }, { status: 423 });
    }

    const { id: sessionId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return NextResponse.json({ error: "session_id_invalido", detail: "Identificador de sesión inválido." }, { status: 400 });
    }

    await asegurarColumnasDictado();
    const db = getDb();
    const result = await db.query(
      `SELECT p.part_index, p.blob_url, p.blob_path, p.bytes, p.sha256,
              p.estado_verificacion, p.fuente_audio, v.driver
       FROM dictado_audio_parte p
       LEFT JOIN dictado_session s ON s.session_id = p.session_id
       LEFT JOIN volcado v ON v.id = s.volcado_id
       WHERE p.session_id = $1
       ORDER BY p.part_index ASC`,
      [sessionId],
    );
    const parts = result.rows as Array<{
      part_index: number; blob_url: string; blob_path: string | null;
      bytes: number; sha256: string | null; estado_verificacion: string | null;
      fuente_audio: string | null; driver: string | null;
    }>;
    if (!parts.length) {
      return NextResponse.json({ error: "audio_no_vinculado", detail: "La sesión no tiene audio original persistido." }, { status: 404 });
    }
    if (parts[0].fuente_audio !== "audio_archivo" && parts[0].driver !== "audio_archivo") {
      return NextResponse.json({
        error: "audio_no_es_importacion_original",
        detail: "Esta sesión no está registrada como importación de un archivo original. No se concatenarán partes de una grabación como si fueran un archivo fuente.",
      }, { status: 409 });
    }
    if (parts.length !== 1 || Number(parts[0].part_index) !== 1) {
      return NextResponse.json({
        error: "audio_original_ambiguo",
        detail: "La exportación del original exige un único archivo importado verificado; no se concatenarán partes de grabación.",
      }, { status: 409 });
    }

    const custody = evaluarCustodiaAudio(
      parts.map((part) => ({
        part_index: Number(part.part_index),
        bytes: Number(part.bytes),
        sha256: part.sha256,
        estado_verificacion: part.estado_verificacion,
      })),
      parts.length,
    );
    if (!custody.ok) {
      return NextResponse.json({
        error: "audio_no_verificado",
        detail: custody.motivo,
        indices_faltantes: custody.indicesFaltantes,
      }, { status: 422 });
    }

    const buffers: Buffer[] = [];
    for (const part of parts) {
      const response = await fetch(String(part.blob_url), { cache: "no-store" });
      if (!response.ok) {
        return NextResponse.json({ error: "blob_inaccesible", detail: `No se pudo recuperar el original (HTTP ${response.status}).` }, { status: 502 });
      }
      const clear = descifrarBytes(Buffer.from(await response.arrayBuffer()));
      const sha = createHash("sha256").update(clear).digest("hex");
      if (clear.length !== Number(part.bytes) || sha !== String(part.sha256 || "").toLowerCase()) {
        return NextResponse.json({ error: "audio_corrupto", detail: `El original no supera la verificación de tamaño y SHA-256 en la parte ${part.part_index}.` }, { status: 422 });
      }
      buffers.push(clear);
    }

    const audio = buffers[0];
    const extension = String(parts[0].blob_path || "").match(/\.([a-z0-9]+)\.khc$/i)?.[1]?.toLowerCase() || "bin";
    const mime = AUDIO_MIME[extension] || "application/octet-stream";
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(audio.length),
        "Content-Disposition": `attachment; filename="audio-original.${extension}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "audio_export_failed",
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
