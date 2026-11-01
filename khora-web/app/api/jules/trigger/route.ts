import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { triggerJulesSession } from "@/lib/jules/trigger";

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
    const { repo, branch, prompt, title, card_url } = payload;

    if (!repo || !branch || !prompt) {
       return NextResponse.json({ error: "Faltan parámetros requeridos: repo, branch, prompt" }, { status: 400 });
    }

    // Solo guardar URLs reales, ignorando variables comprimidas como {{...}}
    const validCardUrl = typeof card_url === "string" && card_url.startsWith("https://") ? card_url : undefined;

    const result = await triggerJulesSession({ repo, branch, prompt, title, card_url: validCardUrl });

    if (result.warning) {
      return NextResponse.json({ success: true, session: result.session, persisted: result.persisted, warning: result.warning }, { status: 200 });
    }

    return NextResponse.json({ success: true, session: result.session, persisted: result.persisted }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/jules/trigger:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: error.status || 500 }
    );
  }
}
