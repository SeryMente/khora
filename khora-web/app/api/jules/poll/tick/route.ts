import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import { listActivities } from "@/lib/jules/client";

export async function POST(req: Request) {
  try {
    const { jules_session_id } = await req.json();

    if (!jules_session_id) {
      return NextResponse.json(
        { error: "Falta jules_session_id en el body." },
        { status: 400 }
      );
    }

    const pool = getDb();

    // Buscar la sesión en jules_sessions
    const sessionResult = await pool.query(
      "SELECT id FROM jules_sessions WHERE jules_session_id = $1",
      [jules_session_id]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Sesión no encontrada en jules_sessions." },
        { status: 404 }
      );
    }

    const session_id = sessionResult.rows[0].id;

    // Leer el cursor de poll_cursors
    const cursorResult = await pool.query(
      "SELECT last_create_time FROM poll_cursors WHERE session_id = $1",
      [session_id]
    );

    let cursorDate: Date | null = null;
    let createTimeCursor: string | undefined = undefined;

    if (cursorResult.rows.length > 0) {
      cursorDate = new Date(cursorResult.rows[0].last_create_time);
      createTimeCursor = cursorDate.toISOString();
    }

    // Llamar a listActivities del cliente Jules
    // El cliente requiere el ID de la API de jules (que asumo es igual a jules_session_id).
    // Si no, necesitamos ajustar esto basado en cómo funciona JulesClient.
    const activitiesResponse = await listActivities(jules_session_id, createTimeCursor);
    const activities = activitiesResponse.activities || [];

    if (activities.length === 0) {
      return NextResponse.json(
        { inserted: 0, cursor: createTimeCursor },
        { status: 200 }
      );
    }

    let inserted = 0;
    let maxActivityDate = cursorDate ? new Date(cursorDate) : new Date(0);

    for (const activity of activities) {
      const activityDate = new Date(activity.createTime);

      const insertResult = await pool.query(`
        INSERT INTO jules_activities (
          session_id, jules_activity_id, activity_type, payload, activity_created_time
        ) VALUES (
          $1, $2, $3, $4, $5
        ) ON CONFLICT (jules_activity_id) DO NOTHING
      `, [
        session_id,
        activity.id,
        activity.name || "unknown", // o activity_type si existe en el payload real. El tipo dice type, client tiene name
        JSON.stringify(activity),
        activity.createTime
      ]);

      if (insertResult.rowCount && insertResult.rowCount > 0) {
        inserted++;
      }

      if (activityDate > maxActivityDate) {
        maxActivityDate = activityDate;
      }
    }

    // Actualizar el cursor
    await pool.query(`
      INSERT INTO poll_cursors (session_id, last_create_time)
      VALUES ($1, $2)
      ON CONFLICT (session_id) DO UPDATE
      SET last_create_time = EXCLUDED.last_create_time
    `, [session_id, maxActivityDate.toISOString()]);

    return NextResponse.json(
      { inserted, cursor: maxActivityDate.toISOString() },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error en /api/jules/poll/tick:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
