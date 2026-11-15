import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { cargarAudioDialogo } from "@/lib/server/audio-dialogo";
import { generarMasterWavDialogo } from "@/lib/server/dialogo-master";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request: NextRequest) {
  const owner = (await auth())?.user?.email;
  if (!owner) return NextResponse.json({ detail: "no_autenticado" }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get("sessionId") || "";
  if (!UUID.test(sessionId)) return NextResponse.json({ detail: "sesion_invalida" }, { status: 400 });
  try {
    const { pistas } = await cargarAudioDialogo(sessionId, owner);
    const wav = await generarMasterWavDialogo(pistas);
    const sha = createHash("sha256").update(wav).digest("hex");
    return new Response(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav", "Content-Length": String(wav.length),
        "Content-Disposition": "attachment; filename=\"dialogo-" + sessionId + ".wav\"",
        "Cache-Control": "private, no-store", "X-Audio-SHA256": sha,
        "X-Audio-Channels": "2", "X-Audio-Channel-Map": "left=USUARIO;right=CHROME",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ detail: "master_no_disponible_los_originales_siguen_custodiados" }, { status: 409 });
  }
}
