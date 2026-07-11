import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import * as crypto from "crypto";
import { Client } from "@notionhq/client";
import { triggerJulesSession } from "@/lib/jules/trigger";
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
        const queryResponse = await (notion.databases as any).query({
            database_id: notionDatabaseId,
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

    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JULES_SESSIONS || "3", 10);
    const capacityRemaining = maxConcurrent - activas.length;

    const logDecision = async (url: string, decision: string, reason: string) => {
        if (pool) {
           await pool.query(`INSERT INTO orchestrator_log (card_url, decision, reason) VALUES ($1, $2, $3)`, [url, decision, reason]);
        }
    }

    if (capacityRemaining <= 0) {
        if (pool) {
            await pool.query(`UPDATE orchestrator_lock SET locked_until = now() WHERE id = 1`);
        }
        for (const cand of candidatas) {
            await logDecision(cand.url, "skipped", "at_capacity");
        }
        return NextResponse.json({ ok: true, fired: [], reason: "at_capacity" }, { status: 200 });
    }

    const activeColZones = new Set<string>();
    activas.forEach(page => {
        const zones = page.properties["Zona de colisión"]?.multi_select || [];
        zones.forEach((z: any) => activeColZones.add(z.name));
    });

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
                if (!["Hecho", "Fusionado", "Integrada (khora-ok)", "Auditada", "Cancelado", "Anulada"].includes(blockStatus)) {
                    isBlocked = true;
                    break;
                }
            } catch (e) {
                isBlocked = true;
                break;
            }
        }

        if (isBlocked) {
            await logDecision(cand.url, "skipped", "blocked_by_relation");
            continue;
        }

        const candZones = (cand.properties["Zona de colisión"]?.multi_select || []).map((z: any) => z.name);
        if (candZones.some((z: string) => activeColZones.has(z))) {
            await logDecision(cand.url, "skipped", "collision_zone_conflict");
            continue;
        }

        let promptBlock = "";
        try {
            const blocksResponse = await notion.blocks.children.list({ block_id: cand.id });
            const pageText = blocksResponse.results.map((b: any) => b.type === "paragraph" && b.paragraph?.rich_text ? b.paragraph.rich_text.map((rt: any) => rt.plain_text).join("") : "").join("\n");

            const startMarker = "👻 PROMPT PARA JULES";
            const endMarker = "🖋️ FIRMA-JULES";

            const startIndex = pageText.indexOf(startMarker);
            const endIndex = pageText.indexOf(endMarker);

            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                 const fullEndIndex = pageText.indexOf("\n", endIndex);
                 promptBlock = pageText.substring(startIndex, fullEndIndex !== -1 ? fullEndIndex : pageText.length);
            }
        } catch (e) {
             // ignore block retrieve error
        }

        if (!promptBlock) {
             await logDecision(cand.url, "skipped", "missing_signature");
             continue;
        }

        const order = cand.properties["Orden de disparo"]?.number || 999999;

        eligibleCandidates.push({
            cand,
            order,
            url: cand.url,
            zones: candZones,
            prompt: promptBlock,
            repo: cand.properties["Repo"]?.rich_text?.[0]?.plain_text || "SeryMente/khora",
            title: cand.properties["Name"]?.title?.[0]?.plain_text || cand.id
        });
    }

    eligibleCandidates.sort((a, b) => {
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
            const result = await triggerJulesSession({
                repo: item.repo,
                branch: "main",
                prompt: item.prompt,
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
            await logDecision(item.url, "fired", "success");

        } catch (e: any) {
            console.error("Failed to trigger Jules for card", item.url, e);
            await logDecision(item.url, "failed", e.message || "trigger_error");
        }
    }

    if (pool) {
        await pool.query(`UPDATE orchestrator_lock SET locked_until = now() WHERE id = 1`);
    }

    return NextResponse.json({ ok: true, fired }, { status: 200 });

  } catch (error: any) {
    console.error("Error en /api/board/orchestrate/tick:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
