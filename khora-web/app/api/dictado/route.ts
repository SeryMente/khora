// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req TRACE-SESSION/010 · @req FIX-DICTADO/D15 · @req TITULOS-LLM/REQ-2
import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardarDictado } from "../../../lib/server/dictado";
import { reconciliarCustodia } from "@/lib/server/custodia-trabajos";
import { reclamarSesion } from "@/lib/server/custodia-schema";
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
    const mode = c?.mode === "cronica" ? "cronica" : undefined;
    if (c?.mode !== undefined && c.mode !== "cronica") return NextResponse.json({ detail: "modalidad_no_admitida" }, { status: 400 });
    if (mode === "cronica" && (
      c?.autoPublish !== true ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(c?.publicationIntentId ?? "")) ||
      typeof c?.capturedAt !== "string" || !Number.isFinite(Date.parse(c.capturedAt)) ||
      (c?.eventTime !== null && typeof c?.eventTime !== "string") ||
      String(c?.eventTime ?? "").length > 180
    )) return NextResponse.json({ detail: "handoff_cronica_invalido" }, { status: 400 });
    const texto = typeof c?.texto === "string" ? c.texto : "";
    const fuenteEntrada =
      c?.fuenteEntrada === "dialogo" ? "dialogo" :
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
      tituloAutomatico: !c?.titulo?.trim(),
      ...(mode === "cronica" ? {
        mode,
        autoPublish: c.autoPublish,
        publicationIntentId: c.publicationIntentId,
        eventTime: c.eventTime ?? null,
        capturedAt: c.capturedAt,
      } : {}),
    });

    // Durable intents are already committed with the original. A callback is only an accelerator.
    after(()=>reconciliarCustodia(session.user!.email!,2).then(()=>undefined).catch(()=>undefined));
    const mp3Estado=audioPartes?.length?"pendiente":"no_aplica";
    return NextResponse.json({ ...r, titulo: tituloResolver, mp3Estado }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { detail: "no se pudo archivar el dictado", causa: String(e) },
      { status: 500 }
    );
  }
}
