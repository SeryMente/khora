// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2 · @req SISTEMA-MENU/E4
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { guardarEdicion, listarLexico } from "../../../lib/server/correcciones";
import { registrarEvento } from "../../../lib/server/eventos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  try {
    const c = await req.json();
    const id = typeof c?.id === "string" ? c.id : "";
    const texto = typeof c?.texto === "string" ? c.texto : "";
    const motivoDelta = typeof c?.motivoDelta === "string" ? c.motivoDelta : "defecto_transcripcion";

    if (id.length === 0) return NextResponse.json({ detail: "falta el id del volcado" }, { status: 400 });
    if (texto.trim().length === 0) return NextResponse.json({ detail: "texto vacio" }, { status: 400 });

    const r = await guardarEdicion(id, texto, session?.user?.email ?? null);

    await registrarEvento({
      fase: "manejo",
      eventId: "MAN-001",
      estado: "OK",
      mensaje: `Edición manual de volcado guardada (motivo: ${motivoDelta})`,
      detalle: {
        volcadoId: id,
        versionNueva: r.version,
        sha256: r.sha256,
        motivoDelta,
        usuario: session?.user?.email ?? null,
      },
      volcadoId: id,
      version: r.version,
      sha256: r.sha256,
      correlacionId: id,
    });

    return NextResponse.json(r);
  } catch (e) {
    await registrarEvento({
      fase: "manejo",
      eventId: "MAN-001",
      estado: "FAIL",
      mensaje: `Fallo al guardar edición manual de volcado: ${String(e)}`,
      detalle: { error: String(e) },
    });
    return NextResponse.json({ detail: "no se pudo guardar la edicion", causa: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const lexico = await listarLexico(200);
    return NextResponse.json({ lexico });
  } catch (e) {
    return NextResponse.json({ detail: "no se pudo leer el lexico", causa: String(e) }, { status: 500 });
  }
}
