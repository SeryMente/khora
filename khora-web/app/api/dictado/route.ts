// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req FIX-DICTADO/D15 · @req TITULOS-LLM/REQ-2
import { NextResponse } from "next/server";
import { guardarDictado } from "../../../lib/server/dictado";
import { espejarVolcado } from "../../../lib/server/espejoNotion";
import { generarTituloConGarantia } from "../../../lib/server/titulos";
import { conTimeout } from "../../../lib/server/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const c = await req.json();
    const texto = typeof c?.texto === "string" ? c.texto : "";
    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "texto vacio" }, { status: 400 });
    }

    // 1. Resolver título con garantía no bloqueante
    let tituloResolver: string | null = c?.titulo?.trim() || null;

    if (!tituloResolver) {
      const resGarantia = await generarTituloConGarantia(texto);
      tituloResolver = resGarantia.title;
    }

    // 2. Persistir dictado en la BD (fuente de verdad)
    const r = await guardarDictado({
      texto,
      sessionId: c?.sessionId ?? c?.sesionId ?? null,
      titulo: tituloResolver,
      audioUrl: c?.audioUrl ?? null,
      audioBytes: c?.audioBytes ?? null,
      duracionSeg: c?.duracionSeg ?? null,
      pulidoAplicado: c?.pulidoAplicado === true,
      audioPartes: Array.isArray(c?.audioPartes) ? c.audioPartes : null,
      estadoTranscripcion: c?.estadoTranscripcion ?? null,
    });

    // 3. Espejar a Notion (secundario, acotado a 8s y try/catch que no frena la respuesta)
    try {
      const volcado_id = r.id;
      const version = 1;
      const sha256 = r.sha256;
      const caracteres = r.chars;

      const audio = c?.audioUrl || null;
      const partesAudio = Array.isArray(c?.audioPartes) ? c.audioPartes.length : null;
      const pulidoAplicado = c?.pulidoAplicado === true;
      const reconexiones = typeof c?.reconexiones === "number" ? c.reconexiones : null;

      await conTimeout(
        espejarVolcado({
          texto,
          titulo: tituloResolver,
          volcado_id,
          version,
          sha256,
          fecha: c?.fecha || null,
          caracteres,
          audio,
          partesAudio,
          pulidoAplicado,
          reconexiones,
        }),
        8000,
        undefined
      );
    } catch (espejoError) {
      console.error("Error al espejar en Notion (no bloqueante):", espejoError);
    }

    return NextResponse.json({ ...r, titulo: tituloResolver }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo archivar el dictado", causa: String(e) },
      { status: 500 }
    );
  }
}
