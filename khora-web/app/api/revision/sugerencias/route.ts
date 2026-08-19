// @l0 L0-002-R · @req REVISION/REQ-1 · @acr ACR-1.2 · @req REVISION-COCKPIT/REQ-1
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { obtenerTodasSugerencias } from "../../../../lib/server/asistenteRevision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ detail: "JSON invalido en el cuerpo de la peticion" }, { status: 400 });
    }

    const texto = typeof body?.texto === "string" ? body.texto : "";
    if (texto.trim().length === 0) {
      return NextResponse.json({ detail: "texto vacio o invalido" }, { status: 400 });
    }

    const sugerencias = await obtenerTodasSugerencias(texto);

    const contadores = {
      total: sugerencias.length,
      alta: sugerencias.filter((s: any) => s.severidad === "alta").length,
      media: sugerencias.filter((s: any) => s.severidad === "media").length,
      baja: sugerencias.filter((s: any) => s.severidad === "baja").length,
      ortotipografico: sugerencias.filter((s: any) => s.origen === "ortotipografico").length,
      llm: sugerencias.filter((s: any) => s.origen === "llm").length
    };

    return NextResponse.json({
      success: true,
      sugerencias,
      contadores
    });
  } catch (e: any) {
    return NextResponse.json(
      { detail: "error al generar sugerencias de revision", causa: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
