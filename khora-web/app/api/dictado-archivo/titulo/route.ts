// @l0 L0-002-R · @req TITULOS-LLM/REQ-1 · @req TITULOS-LLM/REQ-2
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generarTituloConGarantia, asignarTituloVolcado } from "@/lib/server/titulos";
import { getDb } from "@/lib/server/neon";
import { descifrarTexto } from "@/lib/server/cripto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let texto = typeof body?.texto === "string" ? body.texto : "";
    const volcadoId = body?.id || body?.volcadoId;
    let folio: number | null = null;

    if (!texto.trim()) {
      if (!volcadoId) {
        return NextResponse.json({ detail: "Se requiere id o texto" }, { status: 400 });
      }

      const db = getDb();
      const res = await db.query("SELECT folio, texto FROM volcado WHERE id = $1", [volcadoId]);
      if (res.rows.length === 0) {
        return NextResponse.json({ detail: "volcado no encontrado" }, { status: 404 });
      }

      folio = res.rows[0].folio ?? null;
      texto = descifrarTexto(String(res.rows[0].texto || ""));
    } else if (volcadoId) {
      const db = getDb();
      const res = await db.query("SELECT folio FROM volcado WHERE id = $1", [volcadoId]);
      if (res.rows.length > 0) {
        folio = res.rows[0].folio ?? null;
      }
    }

    const resultado = await generarTituloConGarantia(texto, folio);

    if (volcadoId) {
      await asignarTituloVolcado(volcadoId, resultado.title, session.user.email);
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ detail: String(err?.message ?? err) }, { status: 500 });
  }
}
