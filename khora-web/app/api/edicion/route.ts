// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { guardarEdicion, listarLexico } from "../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const c = await req.json();
    const id = typeof c?.id === "string" ? c.id : "";
    const texto = typeof c?.texto === "string" ? c.texto : "";
    if (id.length === 0) return NextResponse.json({ detail: "falta el id del volcado" }, { status: 400 });
    if (texto.trim().length === 0) return NextResponse.json({ detail: "texto vacio" }, { status: 400 });
    const r = await guardarEdicion(id, texto);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo guardar la edicion", causa: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const lexico = await listarLexico(200);
    return NextResponse.json({ lexico });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo leer el lexico", causa: String(e) }, { status: 500 });
  }
}
