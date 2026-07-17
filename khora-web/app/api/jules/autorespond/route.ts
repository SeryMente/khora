export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { getDb } from "@/lib/server/neon";
import { listActivities, sendMessage, listSessions, approvePlan } from "@/lib/jules/client";
import { isSimpleQuestion } from "@/lib/jules/classify";
import { getGroqResponse } from "@/lib/jules/groq";

const SYSTEM_PROMPT = `Eres el asistente de implementacion de Jules para el proyecto Khora. Tu rol es responder preguntas tecnicas de implementacion de manera concisa y directa. Reglas: (1) Ancla SIEMPRE tu respuesta al prompt original de la tarjeta y al criterio Hecho cuando. (2) Responde solo lo que Jules pregunta — no improvises ni amplies el scope. (3) Ante ambiguedad, elige la opcion mas simple que cumpla el Hecho cuando. (4) Las variables de entorno van en Vercel/env, NUNCA en el codigo. (5) No sugieras dependencias no mencionadas en el prompt.`;

async function getNotionCard(url: string | null) {
  if (!url) return null;

  // Extraer ID de Notion asumiendo formato URL estándar (el último segmento que termina en hex, o algo de 32 chars)
  const match = url.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (!match) return null;
  const pageId = match[1];

  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) return null;

    const headers = {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    };

    const [pageRes, blocksRes] = await Promise.all([
      fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers }),
      fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, { headers })
    ]);

    if (!pageRes.ok || !blocksRes.ok) return null;
    const page = await pageRes.json();
    const blocks = await blocksRes.json();
    return { page, blocks };
  } catch (e) {
    console.error("Error fetching Notion card:", e);
    return null;
  }
}

async function fetchGithubFile(path: string) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/SeryMente/khora/contents/${path}`, {
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3.raw"
      }
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.substring(0, 8000); // MAX 8000 chars
  } catch (e) {
    return null;
  }
}

function parseFilePaths(text: string): string[] {
  if (!text) return [];
  const regex = /((?:khora-web\/|lib\/|src\/|scripts\/|tests\/|tooling\/)[\w\-\.\/]+(?:ts|tsx|js|jsx|py|json|md))/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

async function getFullContext(notionCard: any, activities: any[], question: string) {
  let contextParts = [];

  const envVars = ["NOTION_TOKEN", "NOTION_ROADMAP_DATABASE_ID", "DATABASE_URL", "GITHUB_WEBHOOK_SECRET", "INTERNAL_TRIGGER_SECRET", "JULES_API_KEY", "VERCEL_TOKEN", "GITHUB_TOKEN"];
  contextParts.push(`\n## METADATA DEL SISTEMA\nVariables de entorno disponibles en Vercel:\n${envVars.join(", ")}\nRegla: todas van en Vercel, NUNCA en el codigo fuente.`);

  if (notionCard) {
    contextParts.push(`\n## TARJETA NOTION\nPropiedades:\n${JSON.stringify(notionCard.page.properties, null, 2)}\nBloques:\n${JSON.stringify(notionCard.blocks.results, null, 2)}`);

    // Parse files from properties stringified
    const cardText = JSON.stringify(notionCard);
    const filesToFetch = parseFilePaths(cardText);

    for (const file of filesToFetch) {
      if (file === "ARCHITECTURE.md") continue; // Fetched explicitly
      const content = await fetchGithubFile(file);
      if (content) {
        contextParts.push(`\n## ARCHIVO: ${file}\n${content}`);
      }
    }
  }

  const archMd = await fetchGithubFile("ARCHITECTURE.md");
  if (archMd) {
    contextParts.push(`\n## ARCHIVO: ARCHITECTURE.md\n${archMd}`);
  }

  // Last 20 activities
  const recentActivities = activities.slice(-20).map(a => {
      let desc = a.agentMessaged?.agentMessage || a.agentMessaged?.message || a.userMessaged?.message || a.description || a.name;
      return `[${a.createTime}] ${a.originator}: ${desc}`;
  }).join("\n");

  contextParts.push(`\n## HISTORIAL JULES\n${recentActivities}`);
  contextParts.push(`\n## PREGUNTA ESPECIFICA\n${question}`);

  return contextParts.join("\n");
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const maxExecutionTime = 45000; // 45 seconds

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

    let specificSessionId = null;

    // Attempt to read body for event-driven trigger
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();
      if (body && body.session_id) {
        specificSessionId = body.session_id;
      }
    } catch (e) {
      // No body or invalid json, fallback to cron mode
    }

    const pool = getDb();

    // 1. Reconciliate sessions
    let pageToken: string | undefined = undefined;
    let keepFetching = true;

    const activeApiSessions = [];

    while (keepFetching) {
      const julesRes = await listSessions(100, pageToken);
      if (julesRes.sessions) {
         for (const s of julesRes.sessions) {
             if (s.state !== 'COMPLETED' && s.state !== 'FAILED') {
                 activeApiSessions.push(s);
             }
         }
      }
      pageToken = julesRes.nextPageToken;
      if (!pageToken) keepFetching = false;
    }

    for (const s of activeApiSessions) {
      await pool.query(`
        INSERT INTO jules_sessions (jules_session_id, state, created_at, updated_at)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (jules_session_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      `, [s.id, s.state, s.createTime]);
    }

    // 2. Fetch pending sessions
    let query = `
      SELECT id, jules_session_id, tarjeta_url
      FROM jules_sessions
      WHERE state = 'AWAITING_USER_FEEDBACK'
    `;
    let params: any[] = [];

    if (specificSessionId) {
       query += ` AND jules_session_id = $1`;
       params.push(specificSessionId);
    }

    const result = await pool.query(query, params);
    const sessions = result.rows;

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const session of sessions) {
      if (Date.now() - startTime > maxExecutionTime) {
         console.warn("Time budget exceeded, deferring remaining sessions to next cycle.");
         break;
      }

      try {
        const activitiesRes = await listActivities(session.jules_session_id);
        const activities = activitiesRes.activities || [];

        if (activities.length === 0) {
            console.log(`Session ${session.jules_session_id}: skipped (sin actividades)`);
            skipped++;
            continue;
        }

        const lastActivity = activities[activities.length - 1];

        // Ensure the last activity requires our action
        let isWaitingForUs = false;
        if (lastActivity.agentMessaged || lastActivity.planGenerated) {
            isWaitingForUs = true;
        }

        // If the latest activity is from user, it's not waiting for us
        if (lastActivity.userMessaged) {
           isWaitingForUs = false;
           // Update state if needed
           await pool.query(`UPDATE jules_sessions SET state = 'IN_PROGRESS' WHERE id = $1`, [session.id]);
           console.log(`Session ${session.jules_session_id}: skipped (usuario ya respondió (userMessaged))`);
           skipped++;
           continue;
        }

        if (!isWaitingForUs) {
            console.log(`Session ${session.jules_session_id}: skipped (última actividad no es pregunta ni plan)`);
            skipped++;
            continue;
        }

        // Auto-approve plans
        if (lastActivity.planGenerated) {
             // Check if we already approved it
            const existingDecision = await pool.query(
                `SELECT 1 FROM jules_ai_decisions WHERE session_id = $1 AND activity_id = $2 AND answer IS NOT NULL`,
                [session.id, lastActivity.id]
            );
            if (existingDecision.rowCount && existingDecision.rowCount > 0) {
                console.log(`Session ${session.jules_session_id}: skipped (ya respondida (idempotencia))`);
                skipped++;
                continue;
            }

            await approvePlan(session.jules_session_id);
            await pool.query(`
              INSERT INTO jules_ai_decisions (session_id, activity_id, question, answer)
              VALUES ($1, $2, $3, $4)
            `, [session.id, lastActivity.id, "Plan generado requiere aprobación", "PLAN_AUTO_APPROVED"]);

            await pool.query(`UPDATE jules_sessions SET state = 'IN_PROGRESS' WHERE id = $1`, [session.id]);
            inserted++;
            continue;
        }

        // Process agent questions
        const question = lastActivity.agentMessaged?.agentMessage || lastActivity.agentMessaged?.message || lastActivity.description || "";

        if (!question) {
            console.log(`Session ${session.jules_session_id}: skipped (pregunta vacía)`);
            skipped++;
            continue;
        }

        // Idempotency check
        const existingDecision = await pool.query(
            `SELECT 1 FROM jules_ai_decisions WHERE session_id = $1 AND activity_id = $2 AND answer IS NOT NULL`,
            [session.id, lastActivity.id]
        );
        if (existingDecision.rowCount && existingDecision.rowCount > 0) {
            console.log(`Session ${session.jules_session_id}: skipped (ya respondida (idempotencia))`);
            skipped++;
            continue;
        }

        // Bot limit check
        const botResponses = await pool.query(`
           SELECT COUNT(*) as count FROM jules_ai_decisions WHERE session_id = $1
        `, [session.id]);

        if (parseInt(botResponses.rows[0].count) >= 3) {
           console.log(`Session ${session.jules_session_id}: skipped (límite de respuestas por ciclo)`);
           skipped++;
           continue;
        }

        if (isSimpleQuestion(question)) {
          // Si por alguna razon queremos ignorarla
          console.log(`Session ${session.jules_session_id}: skipped (pregunta simple (isSimpleQuestion))`);
          skipped++;
          continue;
        }

        const notionCard = await getNotionCard(session.tarjeta_url);
        const fullContext = await getFullContext(notionCard, activities, question);
        const promptOverride = `${SYSTEM_PROMPT}\n\n=== CONTEXTO ===\n${fullContext}`;

        const groqAnswer = await getGroqResponse(question, promptOverride);

        if (!groqAnswer) {
            await pool.query(`
              INSERT INTO jules_ai_decisions (session_id, activity_id, question, fail_reason)
              VALUES ($1, $2, $3, $4)
            `, [session.id, lastActivity.id, question, "Groq API falló o no devolvió respuesta"]);
            errors++;
            continue;
        }

        await sendMessage(session.jules_session_id, groqAnswer);

        await pool.query(`
          INSERT INTO jules_ai_decisions (session_id, activity_id, question, answer)
          VALUES ($1, $2, $3, $4)
        `, [session.id, lastActivity.id, question, groqAnswer]);

        await pool.query(`UPDATE jules_sessions SET state = 'IN_PROGRESS' WHERE id = $1`, [session.id]);

        inserted++;

      } catch (err: any) {
        console.error(`Error processing session ${session.jules_session_id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ success: true, inserted, skipped, errors }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/jules/autorespond:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: error.status || 500 }
    );
  }
}
