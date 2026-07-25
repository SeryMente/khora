// @l0 L0-002 · @req CORA-01/REQ-2 · @acr ACR-2.1 · @ua —
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

    if (!backendResponse.ok) {
      console.error(`Error del backend: ${backendResponse.status}`);
      return NextResponse.json(
        { error: "Error al consultar el servicio backend" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en proxy de consulta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
