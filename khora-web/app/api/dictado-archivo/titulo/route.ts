// @l0 L0-002-R · @req TITULOS-LLM/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generarTituloEstructurado, asignarTituloVolcado, esTituloGenericoOInvalido } from "@/lib/server/titulos";
import { reportarIncidente } from "@/lib/server/incidentes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const texto = String(body?.texto || "");
    const volcadoId = body?.id || body?.volcadoId;

    if (!texto.trim()) {
      return NextResponse.json({ detail: "Texto requerido para generar título" }, { status: 400 });
    }

    const resultado = await generarTituloEstructurado(texto);

    if (resultado.title && !esTituloGenericoOInvalido(resultado.title)) {
      if (volcadoId) {
        await asignarTituloVolcado(volcadoId, resultado.title, session.user.email);
      }
      return NextResponse.json(resultado);
    }

    if (volcadoId) {
      await reportarIncidente({
        volcadoId,
        tipo: "titulo_ausente",
        severidad: "media",
        origen: "regenerar_titulo_api",
        evidencia: { motivo: "El generador de títulos no produjo un título válido no genérico." },
      });
    }

    return NextResponse.json(
      { error: "titulo_ausente", detail: "No se pudo generar un título no genérico para este texto.", resultado },
      { status: 422 }
    );
  } catch (err: any) {
    return NextResponse.json({ detail: String(err?.message ?? err) }, { status: 500 });
  }
}
