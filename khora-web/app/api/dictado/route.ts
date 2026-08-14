// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req TRACE-SESSION/010
import { NextResponse } from "next/server";
import { guardarDictado } from "../../../lib/server/dictado";
import { espejarVolcado } from "../../../lib/server/espejoNotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const c = await req.json();
    const texto = typeof c?.texto === "string" ? c.texto : "";
    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "texto vacio" }, { status: 400 });
    }
    const r = await guardarDictado({
      texto,
      sessionId: c?.sessionId ?? c?.sesionId ?? null,
      titulo: c?.titulo ?? null,
      audioUrl: c?.audioUrl ?? null,
      audioBytes: c?.audioBytes ?? null,
      duracionSeg: c?.duracionSeg ?? null,
      pulidoAplicado: c?.pulidoAplicado === true,
      audioPartes: Array.isArray(c?.audioPartes) ? c.audioPartes : null,
    });

    try {
      const volcado_id = r.id;
      const version = 1;
      const sha256 = r.sha256;
      const caracteres = r.chars;

      const audio = c?.audioUrl || null;
      const partesAudio = Array.isArray(c?.audioPartes) ? c.audioPartes.length : null;
      const pulidoAplicado = c?.pulidoAplicado === true;
      const reconexiones = typeof c?.reconexiones === "number" ? c.reconexiones : null;

      await espejarVolcado({
        texto,
        titulo: c?.titulo ?? null,
        volcado_id,
        version,
        sha256,
        fecha: c?.fecha || null,
        caracteres,
        audio,
        partesAudio,
        pulidoAplicado,
        reconexiones
      });
    } catch (espejoError) {
      console.error("Error al espejar en Notion:", espejoError);
    }

    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo archivar el dictado", causa: String(e) }, { status: 500 });
  }
}
