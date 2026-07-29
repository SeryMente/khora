// @l0 L0-002 · @req CORA-02/REQ-1 · @acr ACR-1.2
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { cifrarBytes } from "../../../lib/server/cripto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const forma = await req.formData();
    const archivo = forma.get("audio");
    if (!(archivo instanceof Blob)) {
      return NextResponse.json({ detail: "falta el archivo de audio" }, { status: 400 });
    }
    const crudo = Buffer.from(await archivo.arrayBuffer());
    if (!crudo.length) {
      return NextResponse.json({ detail: "el audio llego vacio" }, { status: 400 });
    }
    const cifrado = cifrarBytes(crudo);
    const marca = new Date().toISOString().replace(/[:.]/g, "-");
    const subido = await put("dictado/" + marca + ".webm.khc", cifrado, { access: "public", addRandomSuffix: true, contentType: "application/octet-stream" });
    return NextResponse.json({ url: subido.url, bytes: crudo.length, cifrado: true });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo guardar el audio", causa: String(e) }, { status: 500 });
  }
}