import { poseeVolcado } from "@/lib/server/custodia-acceso";
import { auth } from "@/auth";
// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { NextResponse } from "next/server";
import { listarVersiones, asegurarVersionInicial } from "../../../lib/server/correcciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    if (id.length === 0) return NextResponse.json({ detail: "falta el id" }, { status: 400 });
    const custodio=(await auth())?.user?.email;
    if(!custodio)return NextResponse.json({error:"no_autenticado"},{status:401});
    if(!await poseeVolcado(custodio,id))return NextResponse.json({error:"no_encontrado"},{status:404});
    // Reads never fabricate a version. Creation belongs to archive/edit transactions.
    const versiones = await listarVersiones(id);
    return NextResponse.json({ versiones });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudieron leer las versiones", causa: String(e) }, { status: 500 });
  }
}
