// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/server/neon";
import { asegurarEsquema } from "../../../../lib/server/correcciones";
import { descifrarTexto } from "../../../../lib/server/cripto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await asegurarEsquema();
    const db = getDb();
    const r = await db.query("SELECT * FROM volcado WHERE id = $1", [id]);
    if (r.rows.length === 0) return NextResponse.json({ detail: "volcado no encontrado" }, { status: 404 });
    const fila: any = r.rows[0];
    const claro = { ...fila, texto: descifrarTexto(String(fila.texto ?? "")), texto_original: fila.texto_original ? descifrarTexto(String(fila.texto_original)) : null };
    return NextResponse.json({ volcado: claro });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo leer el volcado", causa: String(e) }, { status: 500 });
  }
}