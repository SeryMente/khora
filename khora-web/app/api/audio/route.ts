// @l0 L0-002-R · @req FIX-DICTADO/D2-D8
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

    const sesionId = forma.get("sesionId");
    const parte = forma.get("parte");

    let destino: string;
    if (typeof sesionId === "string" && sesionId.trim().length > 0 && typeof parte === "string" && parte.trim().length > 0) {
      destino = "dictado/" + sesionId + "/" + parte + ".webm.khc";
    } else {
      const marca = new Date().toISOString().replace(/[:.]/g, "-");
      destino = "dictado/" + marca + ".webm.khc";
    }

    const subido = await put(destino, cifrado, { access: "public", addRandomSuffix: true, contentType: "application/octet-stream" });
    return NextResponse.json({ url: subido.url, bytes: crudo.length, cifrado: true });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo guardar el audio", causa: String(e) }, { status: 500 });
  }
}
