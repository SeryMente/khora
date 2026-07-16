import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { getDb } from "@/lib/server/neon";
import { listActivities, sendMessage } from "@/lib/jules/client";
import { isSimpleQuestion } from "@/lib/jules/classify";
import { getGroqResponse } from "@/lib/jules/groq";

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

    const pool = getDb();
    const result = await pool.query(`
      SELECT id, jules_session_id
      FROM jules_sessions
      WHERE state = 'AWAITING_USER_FEEDBACK'
    `);

    const sessions = result.rows;
    if (sessions.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 }, { status: 200 });
    }

    let inserted = 0;

    for (const session of sessions) {
      try {
        const activitiesRes = await listActivities(session.jules_session_id);
        const activities = activitiesRes.activities || [];

        if (activities.length === 0) continue;

        const lastActivity = activities[activities.length - 1];

        // Extract the pending question. The API gives us various fields for descriptions/messages
        let question = "";
        if (lastActivity.description) {
            question = lastActivity.description;
        } else if (lastActivity.agentMessaged && lastActivity.agentMessaged.message) {
            question = lastActivity.agentMessaged.message;
        }

        if (!question) continue;

        if (isSimpleQuestion(question)) {
          // Skip simple questions
          continue;
        }

        const groqAnswer = await getGroqResponse(question);

        if (!groqAnswer) {
            await pool.query(`
              INSERT INTO jules_ai_decisions (session_id, question, fail_reason)
              VALUES ($1, $2, $3)
            `, [session.id, question, "Groq API falló o no devolvió respuesta"]);
            continue;
        }

        await sendMessage(session.jules_session_id, groqAnswer);

        await pool.query(`
          INSERT INTO jules_ai_decisions (session_id, question, answer)
          VALUES ($1, $2, $3)
        `, [session.id, question, groqAnswer]);

        inserted++;

      } catch (err: any) {
        console.error(`Error processing session ${session.jules_session_id}:`, err);
        // Continue with other sessions
      }
    }

    return NextResponse.json({ success: true, inserted }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/jules/auto-respond:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: error.status || 500 }
    );
  }
}
