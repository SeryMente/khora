// @l0 L0-002 · @req KA-00/REQ-CHAT · @acr ACR-2.1 · @req SISTEMA-MENU/E4
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
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.mensajes) || !body.perfil || typeof body.perfil !== "string") {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud debe incluir 'perfil' (texto) y 'mensajes' (arreglo)" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.KHORA_API_URL;
    const apiKey = process.env.KHORA_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("Faltan variables de entorno para Khora API (KHORA_API_URL / KHORA_API_KEY)");
      return NextResponse.json(
        { error: "Error de configuración interna" },
        { status: 500 }
      );
    }

    const payload = {
      mensajes: body.mensajes,
      perfil: body.perfil,
      ...(body.modelo_override ? { modelo_override: body.modelo_override } : {}),
    };

    const backendResponse = await fetch(`${apiUrl}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KHORA-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const latenciaMs = Date.now() - t0;

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({
        error: "ERROR_BACKEND",
        mensaje: `Error del backend HTTP ${backendResponse.status}`,
      }));

      await registrarEvento({
        fase: "grafo",
        eventId: "CHT-001",
        estado: "FAIL",
        mensaje: `Chat multi-turno fallido (HTTP ${backendResponse.status})`,
        detalle: { status: backendResponse.status, errorData, perfil: body.perfil, latenciaMs },
      });

      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    await registrarEvento({
      fase: "grafo",
      eventId: "CHT-001",
      estado: "OK",
      mensaje: `Chat SSE iniciado para perfil ${body.perfil}`,
      detalle: { perfil: body.perfil, latenciaMs },
    });

    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Error en proxy de chat:", error);
    await registrarEvento({
      fase: "grafo",
      eventId: "CHT-001",
      estado: "FAIL",
      mensaje: `Excepción en proxy de chat: ${String(error)}`,
      detalle: { error: String(error), latenciaMs: Date.now() - t0 },
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
