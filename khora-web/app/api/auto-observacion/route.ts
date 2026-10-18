import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import { diagnosticarEstadoAlmacen } from "@/lib/server/eventos";
import { parseFilters, projectEvent, summarize } from "@/lib/auto-observacion/model";
import { verifyChain } from "@/lib/auto-observacion/integrity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
export async function GET(req: NextRequest) {
  // No test bypass or browser supplied server key: same authenticated operator boundary as product.
  if (!(await auth())) return NextResponse.json({ error: "No autorizado", reason_code: "UNAUTHORIZED" }, { status: 401, headers });
  let filters: ReturnType<typeof parseFilters>;
  try { filters = parseFilters(req.nextUrl.searchParams); }
  catch { return NextResponse.json({ error: "Filtros inválidos", reason_code: "INVALID_FILTER" }, { status: 400, headers }); }
  if (filters.integrity && !filters.correlation) return NextResponse.json({ error: "Selecciona una correlación", reason_code: "CORRELATION_REQUIRED" }, { status: 400, headers });
  try {
    const diag = await diagnosticarEstadoAlmacen();
    if (!diag.ready) return NextResponse.json({ error: "Almacén no disponible", reason_code: diag.reason_code }, { status: 503, headers });
    const db = getDb();
    const values: (string | number)[] = [];
    const where: string[] = [];
    function filter(column: string, operator: string, value: string) { values.push(value); where.push(`${column} ${operator} $${values.length}`); }
    if (filters.phase && !filters.integrity) filter("fase", "=", filters.phase);
    if (filters.correlation) filter("correlacion_id", "=", filters.correlation);
    if (filters.before && !filters.integrity) filter("id", "<", filters.before);
    const limit = filters.integrity ? 500 : filters.limit;
    values.push(limit + 1);
    // PostgreSQL statement timeout bounds DB work, no DDL or mutation. One connection is always released.
    const client = await db.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = '2500ms'");
      const result = await client.query(`SELECT * FROM eventos_sistema ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ${filters.integrity ? "ASC" : "DESC"} LIMIT $${values.length}`, values);
      let outbox = null;
      if (!filters.integrity) {
        const exists = await client.query("SELECT to_regclass('public.eventos_outbox') AS relation");
        if (exists.rows[0]?.relation) {
          const queue = await client.query("SELECT estado, retry_count FROM eventos_outbox WHERE estado IN ('PENDING', 'FAILED') ORDER BY id DESC LIMIT 1001");
          const sample = queue.rows.slice(0, 1000);
          outbox = { pending: sample.filter(r => r.estado === "PENDING" && Number(r.retry_count) < 5).length,
            failed: sample.filter(r => r.estado === "FAILED" || Number(r.retry_count) >= 5).length,
            truncated: queue.rows.length > 1000, scope: "Hasta 1000 entradas pendientes/fallidas; no incluye payload ni error libre" };
        }
      }
      await client.query("COMMIT");
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      if (filters.integrity) return NextResponse.json({ integrity: verifyChain(rows, hasMore), observed_at: new Date().toISOString() }, { headers });
      const events = rows.map(projectEvent);
      return NextResponse.json({ events, summary: summarize(events), outbox, has_more: hasMore,
        next_cursor: hasMore && rows.length ? String(rows[rows.length - 1].id) : null,
        observed_at: new Date().toISOString(), scope: "Muestra reciente, no tasa global ni prueba de salud de todos los servicios. Actualizar recupera commits tardíos; el cursor no garantiza entrega de eventos." }, { headers });
    } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    finally { client.release(); }
  } catch {
    return NextResponse.json({ error: "No se pudo consultar Auto-observación", reason_code: "OBSERVATION_UNAVAILABLE" }, { status: 503, headers });
  }
}
