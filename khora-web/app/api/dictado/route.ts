// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req FIX-DICTADO/D15 · @req TITULOS-LLM/REQ-2
import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardarDictado } from "../../../lib/server/dictado";
import { espejarVolcado } from "../../../lib/server/espejoNotion";
import { generarTituloFallback } from "../../../lib/server/titulos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }
    const c = await req.json();
    const texto = typeof c?.texto === "string" ? c.texto : "";
    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "texto vacio" }, { status: 400 });
    }

    // 1. Resolver un título determinista sin bloquear el archivado con una llamada LLM.
    let tituloResolver: string | null = c?.titulo?.trim() || null;

    if (!tituloResolver) {
      tituloResolver = generarTituloFallback(texto).title;
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
      usuario: session.user.email,
    });

    // 3. Espejar a Notion (secundario, acotado a 8s y try/catch que no frena la respuesta)
    after(async () => {
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
        });
      } catch (espejoError) {
        console.error("Error al espejar en Notion (posterior al archivado):", espejoError);
      }
    });

    return NextResponse.json({ ...r, titulo: tituloResolver }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo archivar el dictado", causa: String(e) },
      { status: 500 }
    );
  }
}
