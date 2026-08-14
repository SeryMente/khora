// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2
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
      titulo: c?.titulo ?? null,
      audioUrl: c?.audioUrl ?? null,
      audioBytes: c?.audioBytes ?? null,
      duracionSeg: c?.duracionSeg ?? null,
      pulidoAplicado: c?.pulidoAplicado === true,
      audioPartes: Array.isArray(c?.audioPartes) ? c.audioPartes : null,
    });

    try {
      // Deestructuramos y preparamos los datos de espejo
      // Al guardarDictado con éxito, ya se conocen r.id (volcado_id), r.version (aunque guardarDictado devuelve {id, sha256, chars}, el volcado inicial es versión 1)
      const volcado_id = r.id;
      const version = 1; // guardarDictado inserta en volcado con version_inicial 1
      const sha256 = r.sha256;
      const caracteres = r.chars;

      // c?.audioPartes tiene partes, si hay partes podemos contar la longitud o pasarlo si se conoce.
      // Pero el requerimiento dice:
      // "Audio" (url), "Partes de audio" (number), "Pulido aplicado" (checkbox), "Reconexiones" (number)
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
