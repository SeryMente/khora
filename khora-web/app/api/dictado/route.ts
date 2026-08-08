// @l0 L0-002-R · @req FIX-DICTADO/D2-D8
import { NextResponse } from "next/server";
import { guardarDictado } from "../../../lib/server/dictado";

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
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo archivar el dictado", causa: String(e) }, { status: 500 });
  }
}
