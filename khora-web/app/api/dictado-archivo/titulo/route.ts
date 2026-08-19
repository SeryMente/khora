// @l0 L0-002-R · @req TITULOS-LLM/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generarTituloEstructurado } from "@/lib/server/titulos";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const texto = String(body?.texto || "");

    if (!texto.trim()) {
      return NextResponse.json({ detail: "Texto requerido para generar título" }, { status: 400 });
    }

    const resultado = await generarTituloEstructurado(texto);
    return NextResponse.json(resultado);
  } catch (err: any) {
    return NextResponse.json({ detail: String(err?.message ?? err) }, { status: 500 });
  }
}
