import { getDb } from "@/lib/server/neon";
import { listSources, createSession } from "@/lib/jules/client";

export async function triggerJulesSession(payload: { repo: string, branch: string, prompt: string, title?: string, card_url?: string }) {
    const { repo, branch, prompt, title, card_url } = payload;

    const sourcesResponse = await listSources();
    const sourceMatch = sourcesResponse.sources.find(s => s.githubRepo?.repo === repo || s.name.includes(repo.split('/').pop() || ""));

    if (!sourceMatch) {
        throw new Error("No se encontró el source para el repositorio especificado");
    }

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
    } as any);

    let persisted = false;
    let warning: string | undefined;

    if (!process.env.DATABASE_URL) {
      warning = "La sesión fue creada en Jules, pero no se registró localmente en Neon por falta de DATABASE_URL.";
      console.warn(warning);
    } else {
      try {
        const pool = getDb();
        await pool.query(`
          INSERT INTO jules_sessions (jules_session_id, branch, state, created_at, updated_at, tarjeta_url)
          VALUES ($1, $2, $3, now(), now(), $4)
        `, [session.id, branch, session.state, card_url]);
        persisted = true;
      } catch (dbError) {
        warning = "La sesión fue creada en Jules, pero ocurrió un error al registrar en la base de datos local.";
        console.warn(warning, dbError);
      }
    }

    return { session, persisted, warning };
}
