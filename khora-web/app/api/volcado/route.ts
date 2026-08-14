// @l0 L0-002-R · @req ING-03/REQ-1,CORA-02/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { archivarVolcado, listarVolcados, resumenVolcados } from "../../../lib/server/volcados";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }
  let cuerpo: any = null;
  try {
    cuerpo = await req.json();
  } catch (e: any) {
    return NextResponse.json({ detail: "JSON invalido", causa: e?.message ?? String(e) }, { status: 400 });
  }
  const texto: string = typeof cuerpo?.texto === "string" ? cuerpo.texto : "";
  if (texto.trim().length === 0) {
    return NextResponse.json({ detail: "texto vacio: nada que archivar" }, { status: 400 });
  }
  try {
    const v = await archivarVolcado({
      texto,
      titulo: typeof cuerpo?.titulo === "string" && cuerpo.titulo.length > 0 ? cuerpo.titulo : null,
      origen: "cora-ui",
      driver: "web",
      usuario: session.user.email,
    });
    return NextResponse.json({ id: v.id, folio: v.folio, sha256: v.sha256, chars: v.chars, estado: v.estado, recibido_en: v.recibido_en }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ detail: "archivo verbatim fallido", causa: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "no autenticado" }, { status: 401 });
  }
  try {
    const items = await listarVolcados(200);
    const resumen = await resumenVolcados();
    return NextResponse.json({ items, resumen });
  } catch (e: any) {
    return NextResponse.json({ detail: "lectura del inventario fallida", causa: e?.message ?? String(e) }, { status: 500 });
  }
}
