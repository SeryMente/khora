import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import * as crypto from "crypto";
import { listSources, createSession, AutomationMode, SourceContext } from "@/lib/jules/client";

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
    const { repo, branch, prompt, title } = payload;

    if (!repo || !branch || !prompt) {
       return NextResponse.json({ error: "Faltan parámetros requeridos: repo, branch, prompt" }, { status: 400 });
    }

    const sourcesResponse = await listSources();
    const sourceMatch = sourcesResponse.sources.find(s => s.githubRepo?.repo === repo || s.name.includes(repo.split('/').pop() || ""));

    if (!sourceMatch) {
        return NextResponse.json({ error: "No se encontró el source para el repositorio especificado" }, { status: 404 });
    }

    // We expect this to fail if JULES_API_KEY is missing/invalid, which is intentional for this test step.
    const session = await createSession({
        sourceContext: {
            source: sourceMatch.name,
            githubRepoContext: {
                startingBranch: branch
            }
        },
        automationMode: "AUTO_CREATE_PR",
        requirePlanApproval: true,
        prompt: prompt,
        title: title
    } as any); // Casting as any for prompt/title compatibility because Jules Client types don't have prompt/title in createSession params right now

    let persisted = false;
    let warning: string | undefined;

    if (!process.env.DATABASE_URL) {
      warning = "La sesión fue creada en Jules, pero no se registró localmente en Neon por falta de DATABASE_URL.";
      console.warn(warning);
    } else {
      try {
        const pool = getDb();
        await pool.query(`
          INSERT INTO jules_sessions (jules_session_id, branch, state, created_at, updated_at)
          VALUES ($1, $2, $3, now(), now())
        `, [session.id, branch, session.state]);
        persisted = true;
      } catch (dbError) {
        warning = "La sesión fue creada en Jules, pero ocurrió un error al registrar en la base de datos local.";
        console.warn(warning, dbError);
      }
    }

    if (warning) {
      return NextResponse.json({ success: true, session, persisted, warning }, { status: 200 });
    }

    return NextResponse.json({ success: true, session, persisted }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error en /api/jules/trigger:", error);
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
