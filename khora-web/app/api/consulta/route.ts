// @l0 L0-002 · @req CORA-01/REQ-2 · @acr ACR-2.1 · @req SISTEMA-MENU/E4
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { registrarEvento } from "@/lib/server/eventos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const t0 = Date.now();

  try {
    const { pregunta } = await req.json();

    if (!pregunta || typeof pregunta !== "string") {
      return NextResponse.json(
        { error: "El campo 'pregunta' es obligatorio y debe ser texto" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.KHORA_API_URL;
    const apiKey = process.env.KHORA_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("Faltan variables de entorno para Khora API");
      return NextResponse.json(
        { error: "Error de configuración interna" },
        { status: 500 }
      );
    }

    const backendResponse = await fetch(`${apiUrl}/api/v1/consulta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KHORA-KEY": apiKey,
      },
      body: JSON.stringify({ pregunta }),
    });

    const latenciaMs = Date.now() - t0;

    if (!backendResponse.ok) {
      console.error(`Error del backend: ${backendResponse.status}`);
      await registrarEvento({
        fase: "grafo",
        eventId: "GRA-003",
        estado: "FAIL",
        mensaje: `Consulta RAG fallida (HTTP ${backendResponse.status})`,
        detalle: { status: backendResponse.status, latenciaMs },
      });
      return NextResponse.json(
        { error: "Error al consultar el servicio backend" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();

    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-003",
      estado: "OK",
      mensaje: `Consulta RAG completada con éxito en ${latenciaMs}ms`,
      detalle: {
        latenciaMs,
        fuentesCount: Array.isArray(data?.fuentes) ? data.fuentes.length : 0,
        fuentes: data?.fuentes,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en proxy de consulta:", error);
    await registrarEvento({
      fase: "grafo",
      eventId: "GRA-003",
      estado: "FAIL",
      mensaje: `Excepción en consulta RAG: ${String(error)}`,
      detalle: { error: String(error), latenciaMs: Date.now() - t0 },
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
