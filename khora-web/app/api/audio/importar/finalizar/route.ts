import { finalizeStagingUpload, b2Enabled, STAGING_CHUNK_BYTES } from "@/lib/server/object-storage";
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

    const body = await request.json();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body?.sessionId || "") ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body?.uploadId || "") ||
        !Number.isSafeInteger(body?.bytes) || body.bytes <= 16 || body.bytes > MAX_STAGED_AUDIO_BYTES ||
        !Number.isInteger(body?.chunkCount) || body.chunkCount !== Math.ceil(body.bytes / STAGING_CHUNK_BYTES) ||
        !/^[a-f0-9]{64}$/i.test(body?.sha256 || "")) {
      return NextResponse.json({ detail: "Finalizacion de carga invalida" }, { status: 400 });
    }

    await reclamarSesion(body.sessionId, session.user.email);
    const staged = await finalizeStagingUpload(body.sessionId, body.uploadId, body.bytes, body.chunkCount, body.sha256);
    return NextResponse.json({ provider: "b2", url: staged.url, bytes: staged.bytes, sha256: staged.sha256, verificado: true },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : String(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}