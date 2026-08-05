// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { pulir } from "../../../lib/server/pulido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const cuerpo = await req.json();
    const texto = typeof cuerpo?.texto === "string" ? cuerpo.texto : "";
    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "texto vacio" }, { status: 400 });
    }
    const res = await pulir(texto);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ detail: "fallo el pulido", causa: String(e) }, { status: 500 });
  }
}
