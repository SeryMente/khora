// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req FIX-DICTADO/D15 · @req TITULOS-LLM/REQ-2
import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardarDictado } from "../../../lib/server/dictado";
import { espejarVolcado } from "../../../lib/server/espejoNotion";
import { generarMp3Sesion } from "@/lib/server/audio-mp3";
import { reclamarSesion } from "@/lib/server/custodia-schema";
import { getDb } from "@/lib/server/neon";
import { generarTituloConGarantia, generarTituloFallback, generarTituloDeUltimoRecurso } from "../../../lib/server/titulos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
    }
    const c = await req.json();
    const texto = typeof c?.texto === "string" ? c.texto : "";
    const fuenteEntrada =
      c?.fuenteEntrada === "chrome_live_caption" ? "chrome_live_caption" :
      c?.fuenteEntrada === "audio_archivo" ? "audio_archivo" :
      c?.fuenteEntrada === "texto" ? "texto" : "microfono";
    const audioPartes = Array.isArray(c?.audioPartes) ? c.audioPartes : null;
    // El audio original puede custodiarse aunque la transcripción haya fallado.
    // guardarDictado contrasta después las partes con el manifiesto verificado en servidor.
    const audioOriginalPendiente =
      fuenteEntrada !== "texto" &&
      Array.isArray(audioPartes) &&
      audioPartes.length > 0 &&
      audioPartes.every((p: any) =>
        Number.isInteger(Number(p?.parte)) &&
        Number(p?.bytes) > 0 &&
        /^[0-9a-f]{64}$/i.test(String(p?.sha256 ?? "")) &&
        p?.verificado === true
      );
    if (texto.trim().length === 0 && !audioOriginalPendiente) {
      return NextResponse.json({ detail: "texto vacio: no hay texto ni audio original verificado para custodiar" }, { status: 400 });
    }

    // 1. Resolver un título determinista sin bloquear el archivado con una llamada LLM.
    let tituloResolver: string | null = c?.titulo?.trim() || null;

    if (!tituloResolver) {
      tituloResolver = generarTituloFallback(texto).title || generarTituloDeUltimoRecurso(texto);
    }

    const sessionId = String(c?.sessionId ?? c?.sesionId ?? "");
    await reclamarSesion(sessionId, session.user.email);
    // 2. Persistir dictado en la BD (fuente de verdad)
    const r = await guardarDictado({
      texto,
      sessionId,
      titulo: tituloResolver,
      audioUrl: c?.audioUrl ?? null,
      audioBytes: c?.audioBytes ?? null,
      duracionSeg: c?.duracionSeg ?? null,
      pulidoAplicado: c?.pulidoAplicado === true,
      audioPartes,
      estadoTranscripcion: c?.estadoTranscripcion ?? null,
      fuenteEntrada,
      usuario: session.user.email,
    });

    // Persist job before responding. Conversion is secondary and must not undo capture.
    let mp3Estado="no_aplica";
    if(audioPartes?.length){try{await getDb().query("INSERT INTO dictado_mp3(session_id) VALUES($1) ON CONFLICT DO NOTHING",[sessionId]);mp3Estado="pendiente";}catch{mp3Estado="cola_no_confirmada";}}
    // 3. Espejar a Notion (secundario, acotado a 8s y try/catch que no frena la respuesta)
    after(async () => {
      if(audioPartes?.length)await generarMp3Sesion(sessionId).catch(()=>undefined);
      if(!c?.titulo?.trim() && texto.trim()) {
        try {
          const title=await generarTituloConGarantia(texto);
          await getDb().query("UPDATE volcado SET titulo=$2 WHERE id=$1 AND titulo=$3",[r.id,title.title,tituloResolver]);
        }catch{/* Capture remains valid. Explicit title regeneration is retryable. */}
      }
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

    return NextResponse.json({ ...r, titulo: tituloResolver, mp3Estado }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo archivar el dictado", causa: String(e) },
      { status: 500 }
    );
  }
}
