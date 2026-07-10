import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import * as crypto from "crypto";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      return NextResponse.json({ error: "Falta firma HMAC" }, { status: 401 });
    }

    const payloadRaw = await req.text();
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      console.warn("GITHUB_WEBHOOK_SECRET no está configurado.");
      return NextResponse.json({ error: "Error de configuración" }, { status: 500 });
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payloadRaw);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    const payload = JSON.parse(payloadRaw);

    if (payload.pull_request) {
      const branch = payload.pull_request.head.ref;
      const pr_url = payload.pull_request.html_url;
      const state = payload.pull_request.state;

      const pool = getDb();

      const updateResult = await pool.query(`
        UPDATE jules_sessions
        SET pr_url = $1, state = $2, updated_at = now()
        WHERE branch = $3
      `, [pr_url, state, branch]);

      if (updateResult.rowCount === 0) {
        console.warn(`No se encontró ninguna sesión para la rama ${branch}`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/github/webhook:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
