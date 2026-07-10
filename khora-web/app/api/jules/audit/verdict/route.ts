import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { session_id, rubric_version, item_scores, verdict, auditor, notes } = payload;

    if (!rubric_version || !item_scores || !verdict || !auditor) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: rubric_version, item_scores, verdict, auditor." },
        { status: 400 }
      );
    }

    if (verdict !== 'pass' && verdict !== 'fail') {
      return NextResponse.json(
        { error: "El campo verdict debe ser 'pass' o 'fail'." },
        { status: 400 }
      );
    }

    const pool = getDb();

    // session_id can be null according to migration "session_id uuid references jules_sessions(id)"
    const query = `
      INSERT INTO audit_verdicts (session_id, rubric_version, item_scores, verdict, auditor, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, session_id, rubric_version, item_scores, verdict, auditor, signed_at, notes;
    `;

    const values = [
      session_id || null,
      rubric_version,
      JSON.stringify(item_scores),
      verdict,
      auditor,
      notes || null
    ];

    const result = await pool.query(query, values);
    const insertedRow = result.rows[0];

    return NextResponse.json({
      success: true,
      verdict: insertedRow
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno al archivar el veredicto." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: "Se requiere el parámetro session_id." },
        { status: 400 }
      );
    }

    const pool = getDb();
    const query = `
      SELECT id, session_id, rubric_version, item_scores, verdict, auditor, signed_at, notes
      FROM audit_verdicts
      WHERE session_id = $1
      ORDER BY signed_at DESC;
    `;

    const result = await pool.query(query, [sessionId]);

    return NextResponse.json({
      success: true,
      verdicts: result.rows
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno al consultar los veredictos." },
      { status: 500 }
    );
  }
}
