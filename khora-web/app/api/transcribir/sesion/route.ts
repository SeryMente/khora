// @l0 L0-002-R · @req FIX-DICTADO/D13
import { NextRequest, NextResponse } from "next/server";
import { transcribirSesion } from "../../../../lib/server/transcribirSesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
    const volcadoId = typeof body?.volcadoId === "string" ? body.volcadoId : undefined;
    const previewText = typeof body?.previewText === "string" ? body.previewText : undefined;

    if (!sessionId && !volcadoId) {
      return NextResponse.json(
        { detail: "Se requiere 'sessionId' o 'volcadoId' para re-transcribir." },
        { status: 400 }
      );
    }

    const res = await transcribirSesion({ sessionId, volcadoId, previewText });

    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json(
      { detail: "Fallo la re-transcripción de la sesión", causa: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
