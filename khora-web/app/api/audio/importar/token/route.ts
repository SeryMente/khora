import { b2Enabled, prepareStagedUpload } from "@/lib/server/object-storage";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_STAGED_AUDIO_BYTES } from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ detail: "origen no permitido" }, { status: 403 });
    }
    if (!b2Enabled()) {
      return NextResponse.json({ error: "storage_b2_not_enabled" }, { status: 503 });
    }
    if (body?.kind !== "storage-policy" ||
        !/^[0-9a-f-]{36}$/i.test(body.sessionId || "") ||
        !Number.isSafeInteger(body.bytes) ||
        body.bytes <= 16 || body.bytes > MAX_STAGED_AUDIO_BYTES) {
      return NextResponse.json({ detail: "Solicitud de carga B2 inválida" }, { status: 400 });
    }
    await reclamarSesion(body.sessionId, session.user.email);
    const staged = await prepareStagedUpload(body.sessionId, body.bytes);
    return NextResponse.json(staged, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : String(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
