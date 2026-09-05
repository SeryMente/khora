// @l0 L0-002-R · @req SISTEMA-MENU/E3,E5
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/neon";
import {
  diagnosticarEstadoAlmacen,
  registrarEventosBatch,
  FaseEvento,
} from "@/lib/server/eventos";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();

  const isTest =
    process.env.PLAYWRIGHT_TEST_RUN === "1" ||
    process.env.PLAYWRIGHT_TEST_BYPASS === "true";
  if (!session && !isTest) {
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
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "1000"), 5000));
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
    console.error("Error imprevisto en GET /api/eventos:", error);
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
    process.env.PLAYWRIGHT_TEST_RUN === "1" ||
    process.env.PLAYWRIGHT_TEST_BYPASS === "true";
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
    let body: any;
    try {
      const rawText = await req.text();
      body = JSON.parse(rawText || "{}");
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    const batchIdempotencyKey =
      req.headers.get("x-idempotency-key") ||
      req.headers.get("idempotency-key") ||
      body.idempotency_key ||
      null;

    let items: any[] = [];
    if (Array.isArray(body)) {
      items = body;
    } else if (Array.isArray(body.events)) {
      items = body.events;
    } else if (Array.isArray(body.items)) {
      items = body.items;
    } else if (typeof body === "object" && body !== null) {
      items = [body];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un evento en el lote" },
        { status: 400 }
      );
    }

    const result = await registrarEventosBatch(items, batchIdempotencyKey);

    return NextResponse.json(
      {
        ok: true,
        summary: {
          accepted: result.accepted,
          duplicates: result.duplicates,
          rejected: result.rejected,
          total: items.length,
        },
        results: result.results,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error imprevisto en POST /api/eventos:", error);
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
