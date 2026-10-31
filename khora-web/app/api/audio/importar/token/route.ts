import { b2Enabled, prepareStagedUpload } from "@/lib/server/object-storage";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_STAGED_AUDIO_BYTES } from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.kind === "storage-policy") {
      const session = await auth();
      if (!session?.user?.email) return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
      const origin = request.headers.get("origin");
      if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ detail: "origen no permitido" }, { status: 403 });
      if (!/^[0-9a-f-]{36}$/i.test(body.sessionId || "") || !Number.isSafeInteger(body.bytes)
        || body.bytes <= 16 || body.bytes > MAX_STAGED_AUDIO_BYTES) return NextResponse.json({ detail: "Carga inválida" }, { status: 400 });
      await reclamarSesion(body.sessionId, session.user.email);
      return NextResponse.json(b2Enabled() ? await prepareStagedUpload(body.sessionId, body.bytes)
        : { provider: "vercel-blob" }, { headers: { "Cache-Control": "no-store" } });
    }
    if (b2Enabled()) return NextResponse.json({ detail: "Actualiza la página para usar el almacenamiento privado" }, { status: 409 });
    const response = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.email) throw new Error("No autenticado");

        let sessionId = "";
        try {
          const parsed = JSON.parse(clientPayload || "{}");
          sessionId =
            typeof parsed.sessionId === "string" ? parsed.sessionId : "";
        } catch {
          sessionId = "";
        }
        if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
          throw new Error("Sesión de importación inválida");
        }
        if (!pathname.startsWith(`staging/audio/${sessionId}/`)) {
          throw new Error("Ruta temporal de audio inválida");
        }

        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_STAGED_AUDIO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            sessionId,
            owner: session.user.email,
          }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
