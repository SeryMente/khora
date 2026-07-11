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
        RETURNING tarjeta_url
      `, [pr_url, state, branch]);

      let tarjeta_url = null;
      if (updateResult.rowCount === 0) {
        console.warn(`No se encontró ninguna sesión para la rama ${branch}`);
      } else {
         tarjeta_url = updateResult.rows[0].tarjeta_url;
      }

      if (action === "closed" && merged) {
         const notionToken = process.env.NOTION_TOKEN;
         const notionDatabaseId = process.env.NOTION_ROADMAP_DATABASE_ID;

         if (notionToken && notionDatabaseId) {
             const notion = new Client({ auth: notionToken });

             try {
                  const pageIdMatch = tarjeta_url ? tarjeta_url.match(/([a-f0-9]{32})/) : null;
                  let pageId = null;

                  if (pageIdMatch) {
                       pageId = pageIdMatch[1];
                  } else {
                      // Fallback query if URL parsing fails or tarjeta_url is missing
                       const queryRes = await (notion.databases as any).query({
                            database_id: notionDatabaseId,
                            filter: {
                                 property: "URL del PR",
                                 url: {
                                      equals: pr_url
                                 }
                            }
                       });
                       if (queryRes.results.length === 1) {
                            pageId = queryRes.results[0].id;
                       } else {
                            console.warn("sin match claro en Notion via URL del PR:", pr_url, "match count:", queryRes.results.length);
                       }
                  }

                  if (pageId) {
                      const today = new Date().toISOString().split('T')[0];
                      await notion.pages.update({
                           page_id: pageId,
                           properties: {
                                "Estado": { status: { name: "Fusionado" } },
                                "🏁 Cerrada el": { date: { start: today } }
                           }
                      });
                      console.log("Updated Notion card to Fusionado:", pageId);
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
