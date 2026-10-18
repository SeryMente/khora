import { readEventBatch } from "@/lib/auto-observacion/ingress";
// @l0 L0-002-R · @req SISTEMA-MENU/E3,E5
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import {
  diagnosticarEstadoAlmacen,
  registrarEventosBatch,
  FaseEvento,
} from "@/lib/server/eventos";

export const runtime = "nodejs";

function validServerKey(req: NextRequest): boolean {
  const supplied = req.headers.get("x-khora-key") || "";
  const expected = process.env.KHORA_API_KEY || "";
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (!a.length || !b.length || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const session = await auth();

  const isTest =
    process.env.NODE_ENV !== "production" && (process.env.PLAYWRIGHT_TEST_RUN === "1" ||
    process.env.PLAYWRIGHT_TEST_BYPASS === "true");
  if (!session && !isTest && !validServerKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const correlacionId = searchParams.get("correlacion_id");

  const diag = await diagnosticarEstadoAlmacen(correlacionId || undefined);
  if (!diag.ready) {
    return NextResponse.json(
      {
        error: "Almacén de eventos no disponible",
        ready: diag.ready,
        reason_code: diag.reason_code,
        retryable: diag.retryable,
        schema_version_expected: diag.schema_version_expected,
        schema_version_detected: diag.schema_version_detected,
        correlation_id: diag.correlation_id,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const db = getDb();

    const fase = searchParams.get("fase") as FaseEvento | null;
    const volcadoId = searchParams.get("volcado_id");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const requestedLimit = Number(searchParams.get("limit") || "1000");
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.floor(requestedLimit), 5000)) : 1000;
    const format = searchParams.get("format");

    const whereClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (fase) {
      whereClauses.push(`fase = $${idx++}`);
      values.push(fase);
    }
    if (correlacionId) {
      whereClauses.push(`correlacion_id = $${idx++}`);
      values.push(correlacionId);
    }
    if (volcadoId) {
      whereClauses.push(`volcado_id = $${idx++}`);
      values.push(volcadoId);
    }
    if (desde) {
      whereClauses.push(`servidor_en >= $${idx++}`);
      values.push(desde);
    }
    if (hasta) {
      whereClauses.push(`servidor_en <= $${idx++}`);
      values.push(hasta);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    values.push(limit);

    const query = `
      SELECT id, fase, event_id, estado, mensaje, detalle, volcado_id, version, sha256, correlacion_id, servidor_en, cliente_en, hash_anterior, event_hash, event_uuid, idempotency_key, schema_version, outcome, component, causation_id, attempt_id, sequence, session_id, release_sha, duration_ms, metrics, reason_code, privacy_class
      FROM eventos_sistema
      ${whereSql}
      ORDER BY id ASC
      LIMIT $${idx}
    `;

    const res = await db.query(query, values);
    const eventos = res.rows;

    if (format === "ndjson") {
      const lines =
        eventos.map((evt) => JSON.stringify(evt)).join("\n") +
        (eventos.length > 0 ? "\n" : "");
      return new NextResponse(lines, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { eventos, count: eventos.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/eventos: EVENT_READ_FAILED");
    return NextResponse.json(
      {
        error: "Error interno procesando eventos",
        ready: false,
        reason_code: "UNKNOWN",
        retryable: true,
        schema_version_expected: diag.schema_version_expected,
        schema_version_detected: diag.schema_version_detected,
        correlation_id: diag.correlation_id,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  const isTest =
    process.env.NODE_ENV !== "production" && (process.env.PLAYWRIGHT_TEST_RUN === "1" ||
    process.env.PLAYWRIGHT_TEST_BYPASS === "true");
  if (!session && !isTest) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const diag = await diagnosticarEstadoAlmacen();
  if (!diag.ready) {
    return NextResponse.json(
      {
        error: "Almacén de eventos no disponible",
        ready: diag.ready,
        reason_code: diag.reason_code,
        retryable: diag.retryable,
        schema_version_expected: diag.schema_version_expected,
        schema_version_detected: diag.schema_version_detected,
        correlation_id: diag.correlation_id,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    let batch: Awaited<ReturnType<typeof readEventBatch>>;
    try { batch = await readEventBatch(req); }
    catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_EVENT_BATCH";
      return NextResponse.json({ error: code }, { status: code === "PAYLOAD_TOO_LARGE" ? 413 : 400, headers: { "Cache-Control": "no-store" } });
    }
    const items = batch.items;
    const result = await registrarEventosBatch(items as Parameters<typeof registrarEventosBatch>[0], batch.key, "browser_reported");

    return NextResponse.json(
      {
        ok: result.rejected === 0,
        summary: {
          accepted: result.accepted,
          duplicates: result.duplicates,
          rejected: result.rejected,
          total: items.length,
        },
        results: result.results,
      },
      {
        status: result.accepted + result.duplicates === 0 ? 422 : 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("POST /api/eventos: EVENT_WRITE_FAILED");
    return NextResponse.json(
      {
        error: "Error interno procesando eventos",
        ready: false,
        reason_code: "UNKNOWN",
        retryable: true,
        schema_version_expected: diag.schema_version_expected,
        schema_version_detected: diag.schema_version_detected,
        correlation_id: diag.correlation_id,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
