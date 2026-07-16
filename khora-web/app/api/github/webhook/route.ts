import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import * as crypto from "crypto";
import { Client } from "@notionhq/client";

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
      const action = payload.action;
      const merged = payload.pull_request.merged;

      const pool = getDb();

      const updateResult = await pool.query(`
        UPDATE jules_sessions
        SET pr_url = $1, state = $2, updated_at = now()
        WHERE branch = $3
        RETURNING tarjeta_url, jules_session_id
      `, [pr_url, state, branch]);

      let tarjeta_url = null;
      let jules_session_id = null;
      if (updateResult.rowCount === 0) {
        console.warn(`No se encontró ninguna sesión para la rama ${branch}`);
      } else {
         tarjeta_url = updateResult.rows[0].tarjeta_url;
         jules_session_id = updateResult.rows[0].jules_session_id;
      }

      if (action === "closed" && merged) {
         const notionToken = process.env.NOTION_TOKEN;
         const notionDatabaseId = process.env.NOTION_ROADMAP_DATABASE_ID;

         if (notionToken && notionDatabaseId) {
             const notion = new Client({ auth: notionToken });

             try {
                  const pageIdMatch = tarjeta_url ? tarjeta_url.match(/([a-f0-9]{32})/) : null;
                  let pageId = null;

                  // First attempt: Search by ID tarea Jules (if we have jules_session_id)
                  if (jules_session_id) {
                      const queryResId = await (notion as any).databases.query({
                          database_id: notionDatabaseId,
                          filter: {
                              property: "ID tarea Jules",
                              rich_text: {
                                  equals: jules_session_id
                              }
                          }
                      });
                      if (queryResId.results.length > 0) {
                          pageId = queryResId.results[0].id;
                      }
                  }

                  // Second attempt: Search by URL del PR
                  if (!pageId && pr_url) {
                       const queryResUrl = await (notion as any).databases.query({
                            database_id: notionDatabaseId,
                            filter: {
                                 property: "URL del PR",
                                 url: {
                                      equals: pr_url
                                 }
                            }
                       });
                       if (queryResUrl.results.length > 0) {
                            pageId = queryResUrl.results[0].id;
                       } else {
                            console.warn("sin match claro en Notion via URL del PR:", pr_url, "match count:", queryResUrl.results.length);
                       }
                  }

                  // Third attempt: Fallback from legacy tarjeta_url
                  if (!pageId && pageIdMatch) {
                       pageId = pageIdMatch[1];
                  }

                  if (pageId) {
                      // Extract real merge date
                      const mergedAt = payload.pull_request.merged_at;
                      // NUNCA retro-datar ni inventar fechas. Do not update '🏁 Cerrada el' if merged_at is falsy.
                      const propertiesUpdate: any = {
                          "Estado": { status: { name: "Fusionado" } },
                          "URL del PR": { url: pr_url }
                      };

                      if (mergedAt) {
                          propertiesUpdate["🏁 Cerrada el"] = { date: { start: new Date(mergedAt).toISOString().split('T')[0] } };
                      }

                      await notion.pages.update({
                           page_id: pageId,
                           properties: propertiesUpdate
                      });
                      console.log("Updated Notion card to Fusionado:", pageId);

                      await pool.query(
                          "INSERT INTO orchestrator_log (card_url, decision, reason) VALUES ($1, $2, $3)",
                          [tarjeta_url, "webhook_merge", "ok"]
                      );
                  } else {
                      await pool.query(
                          "INSERT INTO orchestrator_log (card_url, decision, reason) VALUES ($1, $2, $3)",
                          [tarjeta_url, "webhook_merge", "card_not_found"]
                      );
                  }
             } catch (e) {
                  console.error("Error updating Notion on PR merge:", e);
             }
         }
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
