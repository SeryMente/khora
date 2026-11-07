import { putStagingChunk, STAGING_CHUNK_BYTES, b2Enabled } from "@/lib/server/object-storage";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_STAGED_AUDIO_BYTES } from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ detail: "origen no permitido" }, { status: 403 });
    if (!b2Enabled()) return NextResponse.json({ error: "storage_b2_not_enabled" }, { status: 503 });

    const form = await request.formData();
    const sessionId = form.get("sessionId");
    const uploadId = form.get("uploadId");
    const indexValue = form.get("index");
    const totalValue = form.get("totalBytes");
    const countValue = form.get("chunkCount");
    const file = form.get("chunk");
    if (typeof sessionId !== "string" || typeof uploadId !== "string" || typeof indexValue !== "string" ||
        typeof totalValue !== "string" || typeof countValue !== "string" || !(file instanceof File)) {
      return NextResponse.json({ detail: "Parte de carga invalida" }, { status: 400 });
    }
    const index = Number(indexValue);
    const totalBytes = Number(totalValue);
    const chunkCount = Number(countValue);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(sessionId) || !uuid.test(uploadId) || !Number.isSafeInteger(totalBytes) || totalBytes <= 16 || totalBytes > MAX_STAGED_AUDIO_BYTES ||
        !Number.isInteger(chunkCount) || chunkCount !== Math.ceil(totalBytes / STAGING_CHUNK_BYTES) ||
        !Number.isInteger(index) || index < 0 || index >= chunkCount) {
      return NextResponse.json({ detail: "Parte de carga invalida" }, { status: 400 });
    }
    const expected = index === chunkCount - 1 ? totalBytes - index * STAGING_CHUNK_BYTES : STAGING_CHUNK_BYTES;
    if (file.size !== expected || file.size > STAGING_CHUNK_BYTES) {
      return NextResponse.json({ detail: "Tamano de parte invalido" }, { status: 413 });
    }

    await reclamarSesion(sessionId, session.user.email);
    await putStagingChunk(sessionId, uploadId, index, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, index, bytes: file.size }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : String(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}