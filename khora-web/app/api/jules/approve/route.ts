import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { approvePlan } from "@/lib/jules/client";

export async function POST(req: Request) {
  try {
    const internalSecret = req.headers.get("x-internal-secret");
    if (!internalSecret) {
      return NextResponse.json({ error: "Falta x-internal-secret" }, { status: 401 });
    }

    const expectedSecret = process.env.INTERNAL_TRIGGER_SECRET;
    if (!expectedSecret) {
      console.warn("INTERNAL_TRIGGER_SECRET no está configurado.");
      return NextResponse.json({ error: "Error de configuración" }, { status: 500 });
    }

    const sigBuffer = Buffer.from(internalSecret);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    const payload = await req.json();
    const { jules_session_id } = payload;

    if (!jules_session_id) {
       return NextResponse.json({ error: "Falta el parámetro jules_session_id" }, { status: 400 });
    }

    await approvePlan(jules_session_id);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error en /api/jules/approve:", error);
    if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message || "Error interno del servidor" },
          { status: 500 }
        );
    } else {
        return NextResponse.json(
          { error: "Error interno del servidor" },
          { status: 500 }
        );
    }
  }
}
