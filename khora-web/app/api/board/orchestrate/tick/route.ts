import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import * as crypto from "crypto";
import { Client } from "@notionhq/client";
import { triggerJulesSession } from "@/lib/jules/trigger";
import { extractPromptFromBlocks } from "@/lib/utils/extractPrompt";
import { listActivities, listSessions } from "@/lib/jules/client";
import { Pool } from 'pg';

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

    const notionToken = process.env.NOTION_TOKEN;
    const notionDatabaseId = process.env.NOTION_ROADMAP_DATABASE_ID;

    if (!notionToken || !notionDatabaseId) {
        return NextResponse.json({ ok: false, reason: "missing_secrets" }, { status: 200 });
    }

    let pool: Pool | undefined;
    try {
        pool = getDb();
    } catch (e) {
        console.warn("Database not configured, skipping lock and log check");
    }

    if (pool) {
      const lockResult = await pool.query(`
        UPDATE orchestrator_lock
        SET locked_until = now() + interval '5 minutes'
        WHERE id = 1 AND (locked_until IS NULL OR locked_until < now())
        RETURNING id
      `);

      if (lockResult.rowCount === 0) {
        const checkResult = await pool.query(`SELECT 1 FROM orchestrator_lock WHERE id = 1`);
        if (checkResult.rowCount === 0) {
           await pool.query(`INSERT INTO orchestrator_lock (id, locked_until) VALUES (1, now() + interval '5 minutes')`);
        } else {
           return NextResponse.json({ ok: true, fired: [], reason: "locked" }, { status: 200 });
        }
      }
    }

    const notion = new Client({ auth: notionToken });

    let candidatas: any[] = [];
    let activas: any[] = [];

    try {
        // Correct query method path
        const queryResponse = await (notion as any).dataSources.query({
            data_source_id: notionDatabaseId,
            filter: {
                or: [
                    {
                        property: "Estado",
                        status: {
                            equals: "Firmada · lista para prompt"
                        }
                    },
                    {
                        property: "Estado",
                        status: {
                            equals: "En curso"
                        }
                    },
                    {
                        property: "Estado",
                        status: {
                            equals: "Prompt emitido"
                        }
                    },
                    {
                        property: "Estado",
                        status: {
                            equals: "En Jules"
                        }
                    },
                    {
                        property: "Estado",
                        status: {
                            equals: "PR abierto"
                        }
                    }
                ]
            }
        });

        candidatas = queryResponse.results.filter((page: any) => page.properties["Estado"]?.status?.name === "Firmada · lista para prompt");
        activas = queryResponse.results.filter((page: any) => ["En curso", "Prompt emitido", "En Jules", "PR abierto"].includes(page.properties["Estado"]?.status?.name));

    } catch (e: any) {
        if (pool) {
           await pool.query(`UPDATE orchestrator_lock SET locked_until = now() WHERE id = 1`);
        }
        return NextResponse.json({ ok: false, reason: "schema_mismatch" }, { status: 200 });
    }

    const stats = {
        despachadas: 0,
        bloqueadas_por_dependencia: 0,
        bloqueadas_por_zona: 0,
        at_capacity: 0,
        reconciliadas: 0,
        reintentos: 0,
        errores: 0
    };

    const activasJules = activas.filter(page => page.properties["Ejecutor"]?.select?.name === "🤖 Jules");
    const activeColZones = new Set<string>();
    activas.forEach(page => {
        const zones = page.properties["Zona de colisión"]?.multi_select || [];
        zones.forEach((z: any) => activeColZones.add(z.name));
    });

    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JULES_SESSIONS || "3", 10);
    let capacityRemaining = maxConcurrent - activasJules.length;

    const logDecision = async (url: string, decision: string, reason: string) => {
        console.log(`[Orchestrator] URL: ${url} | Decision: ${decision} | Reason: ${reason}`);
        if (pool) {
           await pool.query(`INSERT INTO orchestrator_log (card_url, decision, reason) VALUES ($1, $2, $3)`, [url, decision, reason]);
        }
    }

    // RECONCILIACIÓN por tick & SESIONES NACIDAS ROTAS
    let allJulesSessions: any[] = [];
    try {
         const julesRes = await listSessions(100);
         allJulesSessions = julesRes.sessions || [];
    } catch (e: any) {
         console.warn(`[Orchestrator] Failed to fetch Jules sessions for reconciliation: ${e.message}`);
    }

    const enJules = activas.filter(page => page.properties["Estado"]?.status?.name === "En Jules");

    for (const page of enJules) {
        const url = page.url;
        const julesSessionId = page.properties["ID tarea Jules"]?.rich_text?.[0]?.plain_text;

        if (!julesSessionId) continue;

        try {
            // Reconciliación: Check if session opened a PR
            const remoteSession = allJulesSessions.find(s => s.id === julesSessionId);
            if (remoteSession && remoteSession.state === "PR_CREATED") {
                 let prUrl = remoteSession.url;

                 await notion.pages.update({
                      page_id: page.id,
                      properties: {
                           "Estado": { status: { name: "PR abierto" } },
                           "URL del PR": { url: prUrl }
                      }
                 });

                 stats.reconciliadas++;
                 await logDecision(url, "reconciled", "pr_opened_via_poll");
                 continue;
            }

            const res = await listActivities(julesSessionId);
            const activities = res.activities || [];

            let broken = false;
            let setupFound = false;

            for (const act of activities) {
                 if (act.agentMessaged?.agentMessage) {
                      const msg = act.agentMessaged.agentMessage.toLowerCase();
                      if (msg.includes("initial commit") || msg.includes("completamente vacío") || msg.includes("repositorio vacío")) {
                           broken = true;
                           break;
                      }
                 }
                 if (act.name || act.description) {
                      setupFound = true;
                 }
            }

            if (!broken && !setupFound && pool) {
                 const sessionRes = await pool.query(`SELECT created_at FROM jules_sessions WHERE jules_session_id = $1`, [julesSessionId]);
                 if (sessionRes.rowCount !== null && sessionRes.rowCount > 0) {
                      const ageMs = Date.now() - new Date(sessionRes.rows[0].created_at).getTime();
                      if (ageMs > 20 * 60 * 1000) {
                           broken = true;
                      }
                 }
            }

            if (broken && pool) {
                 const attemptsRes = await pool.query(`SELECT COUNT(*) as count FROM jules_sessions WHERE tarjeta_url = $1`, [url]);
                 const attempts = parseInt(attemptsRes.rows[0].count, 10);

                 if (attempts < 3) {
                      console.log(`[Orchestrator] Sesh ${julesSessionId} rota, reintentando. Attempt ${attempts+1}/3`);

                      const promptBlock = await extractPromptFromBlocks(notion, page.id);
                      if (promptBlock) {
                          const title = page.properties["Name"]?.title?.[0]?.plain_text || page.id;
                          const repo = page.properties["Repo"]?.rich_text?.[0]?.plain_text || "SeryMente/khora";

                          // Disconnect broken session from capacity and active zones
                          const zones = page.properties["Zona de colisión"]?.multi_select || [];
                          zones.forEach((z: any) => activeColZones.delete(z.name));

                          const result = await triggerJulesSession({
                              repo: repo,
                              branch: "main",
                              prompt: promptBlock + `\n\nURL DE LA TAREA: ${url}`,
                              title: title,
                              card_url: url
                          });

                          await notion.pages.update({
                              page_id: page.id,
                              properties: {
                                  "ID tarea Jules": { rich_text: [{ text: { content: result.session.id } }] }
                              }
                          });

                          zones.forEach((z: any) => activeColZones.add(z.name)); // Re-add zone for new session
                          stats.reintentos++;
                          await logDecision(url, "recreated", `broken_session_attempt_${attempts+1}`);
                      }
                 } else {
                      console.error(`[CRÍTICO] Sesh ${julesSessionId} rota y agotó reintentos. Marcando bloqueada.`);
                      await notion.pages.update({
                           page_id: page.id,
                           properties: {
                               "Estado": { status: { name: "Bloqueado" } }
                           }
                      });

                      capacityRemaining++;
                      const zones = page.properties["Zona de colisión"]?.multi_select || [];
                      zones.forEach((z: any) => activeColZones.delete(z.name));

                      stats.errores++;
                      await logDecision(url, "blocked", "max_retries_exceeded");
                 }
            }
        } catch (e: any) {
             console.warn(`Could not check activities for ${julesSessionId}:`, e.message);
        }
    }

    if (capacityRemaining <= 0) {
        if (pool) {
            await pool.query(`UPDATE orchestrator_lock SET locked_until = now() WHERE id = 1`);
        }
        for (const cand of candidatas) {
            stats.at_capacity++;
            await logDecision(cand.url, "skipped", "at_capacity");
        }

        console.log(`[Orchestrator Stats]`, stats);
        return NextResponse.json({ ok: true, fired: [], reason: "at_capacity", stats }, { status: 200 });
    }

    const eligibleCandidates = [];

    for (const cand of candidatas) {
        const executor = cand.properties["Ejecutor"]?.select?.name;
        if (executor !== "🤖 Jules") {
            await logDecision(cand.url, "skipped", "not_jules_executor");
            continue;
        }

        const blockers = cand.properties["⛔ Bloqueada por"]?.relation || [];
        let isBlocked = false;
        for (const block of blockers) {
            try {
                const blockPage: any = await notion.pages.retrieve({ page_id: block.id });
                const blockStatus = blockPage.properties["Estado"]?.status?.name;
                // Exigir estados terminales estrictamente exitosos para que las dependencias corran en secuencia
                if (!["Hecho", "Fusionado", "Integrada (khora-ok)", "Auditada"].includes(blockStatus)) {
                    isBlocked = true;
                    break;
                }
            } catch (e) {
                isBlocked = true;
                break;
            }
        }

        if (isBlocked) {
            stats.bloqueadas_por_dependencia++;
            await logDecision(cand.url, "skipped", "blocked_by_relation");
            continue;
        }

        const candZones = (cand.properties["Zona de colisión"]?.multi_select || []).map((z: any) => z.name);
        if (candZones.some((z: string) => activeColZones.has(z))) {
            stats.bloqueadas_por_zona++;
            await logDecision(cand.url, "skipped", "collision_zone_conflict");
            continue;
        }

        if (cand.properties["🔓 OK operador"]?.checkbox !== true) {
            await logDecision(cand.url, "skipped", "missing_operator_ok");
            continue;
        }

        let promptBlock = "";
        try {
            promptBlock = await extractPromptFromBlocks(notion, cand.id);
        } catch (e) {
             // ignore block retrieve error
        }

        if (!promptBlock) {
             await logDecision(cand.url, "skipped", "missing_signature");
             continue;
        }

        const bypass = cand.properties["🚨 Urgente (bypass)"]?.checkbox === true;
        const order = cand.properties["Orden de disparo"]?.number || 999999;

        eligibleCandidates.push({
            cand,
            bypass,
            order,
            url: cand.url,
            zones: candZones,
            prompt: promptBlock,
            repo: cand.properties["Repo"]?.rich_text?.[0]?.plain_text || "SeryMente/khora",
            title: cand.properties["Name"]?.title?.[0]?.plain_text || cand.id
        });
    }

    eligibleCandidates.sort((a, b) => {
        if (a.bypass !== b.bypass) return a.bypass ? -1 : 1;
        if (a.order !== b.order) return a.order - b.order;
        return a.url.localeCompare(b.url);
    });

    const fired = [];
    const selectedZones = new Set<string>();

    for (const item of eligibleCandidates) {
        if (fired.length >= capacityRemaining) break;

        if (item.zones.some((z: string) => selectedZones.has(z))) {
             await logDecision(item.url, "skipped", "collision_zone_conflict_batch");
             continue;
        }

        try {
            const realPrompt = item.prompt + `\n\nURL DE LA TAREA: ${item.url}`;

            const result = await triggerJulesSession({
                repo: item.repo,
                branch: "main",
                prompt: realPrompt,
                title: item.title,
                card_url: item.url
            });

            await notion.pages.update({
                page_id: item.cand.id,
                properties: {
                    "Estado": { status: { name: "En Jules" } },
                    "ID tarea Jules": { rich_text: [{ text: { content: result.session.id } }] }
                }
            });

            item.zones.forEach((z: string) => selectedZones.add(z));
            fired.push(item.url);

            void fetch('https://khora-web.vercel.app/api/jules/autorespond', {
                method: 'POST',
                headers: { 'x-internal-secret': process.env.INTERNAL_TRIGGER_SECRET || '', 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: result.session.id, trigger: 'post_dispatch' })
            }).catch(e => console.error('[tick] autorespond post-dispatch failed:', e));

            stats.despachadas++;
            await logDecision(item.url, "fired", "success");

        } catch (e: any) {
            console.error("Failed to trigger Jules for card", item.url, e);
            stats.errores++;
            await logDecision(item.url, "failed", e.message || "trigger_error");
        }
    }

    if (pool) {
        await pool.query(`UPDATE orchestrator_lock SET locked_until = now() WHERE id = 1`);
        await pool.query(
            `INSERT INTO orchestrator_log (card_url, decision, reason) VALUES ($1, $2, $3)`,
            ["tick_stats", "summary", JSON.stringify(stats)]
        );
    }

    console.log(`[Orchestrator Stats]`, stats);

    void fetch('https://khora-web.vercel.app/api/jules/autorespond', {
        method: 'POST',
        headers: { 'x-internal-secret': process.env.INTERNAL_TRIGGER_SECRET || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'orchestrator_tick' })
    }).catch(e => console.error('[tick] autorespond sweep failed:', e));

    return NextResponse.json({ ok: true, fired, stats }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/board/orchestrate/tick:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
