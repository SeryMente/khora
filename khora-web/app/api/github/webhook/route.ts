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
      const body = payload.pull_request.body || "";

      let jules_session_id = null;
      const sessionMatch = body.match(/PR created automatically by Jules for task\s+(\S+)/);
      if (sessionMatch) {
        jules_session_id = sessionMatch[1];
      }

      const pool = getDb();

      let tarjeta_url = null;
      if (jules_session_id) {
        const selectResult = await pool.query(`
          SELECT tarjeta_url FROM jules_sessions WHERE jules_session_id = $1
        `, [jules_session_id]);

        if (selectResult.rowCount === 0) {
          console.warn(`No se encontró ninguna sesión para jules_session_id ${jules_session_id}`);
        } else {
          tarjeta_url = selectResult.rows[0].tarjeta_url;
        }
      } else {
        console.warn(`No se encontró jules_session_id en el cuerpo del PR de la rama ${branch}`);
      }

      if (action === "closed" && merged || action === "opened" || action === "reopened") {
         const notionToken = process.env.NOTION_TOKEN;
         const notionDatabaseId = process.env.NOTION_ROADMAP_DATABASE_ID;

         if (notionToken && notionDatabaseId) {
             const notion = new Client({ auth: notionToken });

             try {
                  let pageIdMatch = null;
                  if (tarjeta_url) {
                      try {
                          const parsedUrl = new URL(tarjeta_url);
                          const m = parsedUrl.pathname.match(/([a-fA-F0-9]{32})$/);
                          if (m) {
                              pageIdMatch = m;
                          }
                      } catch (e) {
                          // Invalid URL format, ignore
                      }
                  }

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

                  // Extract Jules Task ID from branch if missing jules_session_id
                  if (!pageId && branch) {
                      const m = branch.match(/-([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/);
                      if (m) {
                           const fallbackId = m[1];
                           const queryResId2 = await (notion as any).databases.query({
                              database_id: notionDatabaseId,
                              filter: {
                                  property: "ID tarea Jules",
                                  rich_text: {
                                      equals: fallbackId
                                  }
                              }
                          });
                          if (queryResId2.results.length > 0) {
                              pageId = queryResId2.results[0].id;
                          }
                      }

                      // Match by branch name if still not found
                      if (!pageId) {
                          const queryResBranch = await (notion as any).databases.query({
                              database_id: notionDatabaseId,
                              filter: {
                                  property: "Rama",
                                  rich_text: {
                                      equals: branch
                                  }
                              }
                          });
                          if (queryResBranch.results.length > 0) {
                              pageId = queryResBranch.results[0].id;
                          }
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
                      if (action === "opened" || action === "reopened") {
                          const propertiesUpdate: any = {
                              "Estado": { status: { name: "PR abierto" } },
                              "URL del PR": { url: pr_url },
                              "Rama": { rich_text: [{ text: { content: branch } }] }
                          };

                          await notion.pages.update({
                               page_id: pageId,
                               properties: propertiesUpdate
                          });
                          console.log("Updated Notion card to PR abierto:", pageId);
                      } else if (action === "closed" && merged) {
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
                      }
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
