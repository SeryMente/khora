import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_STAGED_AUDIO_BYTES } from "@/lib/server/importedAudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
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
