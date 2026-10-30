import { getMcpReadOnlyDb } from "./mcp-db";

const MAX_LIMIT = 200;
const DEFAULT_SECONDS = 300;
const RUNTIME_STALE_MS = 15_000;

function parseSeconds(value?: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(value as number) : DEFAULT_SECONDS, 1), 86400);
}

function parseLimit(value?: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(value as number) : 50, 1), MAX_LIMIT);
}

function parseCursor(value?: number) {
  return Math.max(Number.isFinite(value) ? Math.floor(value as number) : 0, 0);
}

export async function toolKhoraObservacionInstantanea(args?: { session_id?: string }) {
  const db = getMcpReadOnlyDb();
  const sessionFilter = args?.session_id ? "WHERE session_id = $1" : "";
  const sessionParams = args?.session_id ? [args.session_id] : [];

  const [stateRes, latestRes, activityRes, failureRes, cursorRes, sessionsRes] = await Promise.all([
    db.query(
      `SELECT runtime_id, session_id, observed_at, updated_at, route, screen,
              active, visible, focused, release_sha, source, privacy_class, state
       FROM khora_runtime_state
       ${sessionFilter}
       ORDER BY updated_at DESC
       LIMIT 1`,
      sessionParams,
    ),
    db.query(
      `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
              sequence, session_id, release_sha, duration_ms, reason_code,
              correlacion_id, causation_id, attempt_id, cliente_en, servidor_en,
              detalle, metrics, event_hash
       FROM eventos_sistema
       ${args?.session_id ? "WHERE session_id = $1" : ""}
       ORDER BY id DESC
       LIMIT 1`,
      sessionParams,
    ),
    db.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE estado = 'FAIL' OR outcome = 'FAILURE' OR COALESCE(detalle->>'severity', detalle->'observation'->>'severity') IN ('ERROR','CRITICAL'))::int AS failures,
              count(*) FILTER (WHERE COALESCE(detalle->>'severity', detalle->'observation'->>'severity') = 'WARN')::int AS warnings,
              count(DISTINCT session_id)::int AS sessions,
              max(servidor_en) AS last_server_event_at,
              max(cliente_en) AS last_client_event_at
       FROM eventos_sistema
       WHERE servidor_en >= NOW() - INTERVAL '5 minutes'
       ${args?.session_id ? "AND session_id = $1" : ""}`,
      sessionParams,
    ),
    db.query(
      `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
              sequence, session_id, release_sha, duration_ms, reason_code,
              correlacion_id, cliente_en, servidor_en, detalle, metrics
       FROM eventos_sistema
       WHERE servidor_en >= NOW() - INTERVAL '60 minutes'
         AND (estado = 'FAIL' OR COALESCE(detalle->>'severity', detalle->'observation'->>'severity') IN ('ERROR','CRITICAL') OR outcome = 'FAILURE')
       ${args?.session_id ? "AND session_id = $1" : ""}
       ORDER BY id DESC
       LIMIT 20`,
      sessionParams,
    ),
    db.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS cursor FROM eventos_sistema`,
    ),
    db.query(
      `SELECT runtime_id, session_id, observed_at, updated_at, route, screen,
              active, visible, focused, release_sha, source, state
       FROM khora_runtime_state
       WHERE updated_at >= NOW() - INTERVAL '15 minutes'
       ${args?.session_id ? "AND session_id = $1" : ""}
       ORDER BY updated_at DESC
       LIMIT 20`,
      sessionParams,
    ),
  ]);

  const runtime = stateRes.rows[0] || null;
  const latest = latestRes.rows[0] || null;
  const activity = activityRes.rows[0] || {
    total: 0,
    failures: 0,
    warnings: 0,
    sessions: 0,
    last_server_event_at: null,
    last_client_event_at: null,
  };
  const observedAt = runtime?.updated_at ? new Date(runtime.updated_at).getTime() : null;
  const runtimeAgeMs = observedAt === null ? null : Math.max(0, Date.now() - observedAt);
  const runtimeStale = runtimeAgeMs === null || runtimeAgeMs > RUNTIME_STALE_MS;
  const lastServer = latest?.servidor_en ? new Date(latest.servidor_en).getTime() : null;
  const eventLagMs = lastServer === null ? null : Math.max(0, Date.now() - lastServer);

  return {
    observado_en_utc: new Date().toISOString(),
    runtime: {
      disponible: runtime !== null,
      stale: runtimeStale,
      antiguedad_ms: runtimeAgeMs,
      estado_actual: runtime,
      umbral_stale_ms: RUNTIME_STALE_MS,
    },
    actividad_ultimos_5_minutos: {
      total_eventos: Number(activity.total || 0),
      fallos: Number(activity.failures || 0),
      advertencias: Number(activity.warnings || 0),
      sesiones: Number(activity.sessions || 0),
      ultimo_evento_servidor: activity.last_server_event_at,
      ultimo_evento_cliente: activity.last_client_event_at,
      antiguedad_ultimo_evento_ms: eventLagMs,
    },
    ultima_observacion: latest,
    sesiones_activas_observadas: sessionsRes.rows,
    fallos_ultimos_60_minutos: failureRes.rows,
    event_cursor: Number(cursorRes.rows[0]?.cursor || 0),
    almacenamiento: {
      disponible: true,
      fuente: "khora_runtime_state + eventos_sistema",
      modo: "solo_lectura",
    },
    interpretacion_operativa:
      runtimeStale
        ? "El estado semántico del navegador no es fresco; no debe asumirse que la instancia siga abierta o activa."
        : "El estado semántico del navegador está actualizado dentro del umbral operativo.",
    lectura: runtimeStale
      ? "El estado semántico del navegador no es fresco; no debe asumirse que la instancia siga abierta o activa."
      : "El estado semántico del navegador está actualizado dentro del umbral operativo.",
  };
}

export async function toolKhoraEstadoVivo() {
  return toolKhoraObservacionInstantanea();
}

export async function toolKhoraEventosRecientes(args: {
  segundos?: number;
  limite?: number;
  session_id?: string;
  component?: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  outcome?: "SUCCESS" | "FAILURE" | "PARTIAL" | "SKIPPED" | "PENDING";
  fase?: string;
  scope?: string;
  category?: string;
}) {
  const db = getMcpReadOnlyDb();
  const segundos = parseSeconds(args.segundos);
  const limite = parseLimit(args.limite);
  const where: string[] = ["servidor_en >= NOW() - ($1 * INTERVAL '1 second')"];
  const params: unknown[] = [segundos];

  if (args.session_id) {
    params.push(args.session_id);
    where.push(`session_id = $${params.length}`);
  }
  if (args.component) {
    params.push(args.component);
    where.push(`component = $${params.length}`);
  }
  if (args.severity) {
    params.push(args.severity);
    where.push("COALESCE(detalle->>'severity', detalle->'observation'->>'severity') = $" + params.length);
  }
  if (args.outcome) {
    params.push(args.outcome);
    where.push(`outcome = $${params.length}`);
  }
  if (args.fase) {
    params.push(args.fase);
    where.push(`fase = $${params.length}`);
  }
  if (args.scope) {
    params.push(args.scope);
    where.push("COALESCE(detalle->>'scope', detalle->'observation'->>'scope') = $" + params.length);
  }
  if (args.category) {
    params.push(args.category);
    where.push("COALESCE(detalle->>'category', detalle->'observation'->>'category') = $" + params.length);
  }

  params.push(limite);
  const limitIndex = params.length;

  const res = await db.query(
    `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
            sequence, session_id, release_sha, duration_ms, reason_code,
            correlacion_id, causation_id, attempt_id, cliente_en, servidor_en,
            detalle, metrics, event_hash
     FROM eventos_sistema
     WHERE ${where.join(" AND ")}
     ORDER BY id DESC
     LIMIT $${limitIndex}`,
    params
  );

  return {
    ventana_segundos: segundos,
    limite,
    retornados: res.rows.length,
    eventos: res.rows,
  };
}

export async function toolKhoraEventosDesde(args: {
  cursor?: number;
  limite?: number;
  session_id?: string;
}) {
  const db = getMcpReadOnlyDb();
  const cursor = parseCursor(args.cursor);
  const limite = parseLimit(args.limite);
  const where = ["id > $1"];
  const params: unknown[] = [cursor];

  if (args.session_id) {
    params.push(args.session_id);
    where.push(`session_id = $${params.length}`);
  }

  params.push(limite + 1);
  const res = await db.query(
    `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
            sequence, session_id, release_sha, duration_ms, reason_code,
            correlacion_id, causation_id, attempt_id, cliente_en, servidor_en,
            detalle, metrics, event_hash
     FROM eventos_sistema
     WHERE ${where.join(" AND ")}
     ORDER BY id ASC
     LIMIT $${params.length}`,
    params
  );

  const hasMore = res.rows.length > limite;
  const events = hasMore ? res.rows.slice(0, limite) : res.rows;
  const nextCursor = events.length > 0 ? Number(events[events.length - 1].id) : cursor;

  return {
    cursor_entrada: cursor,
    cursor_siguiente: nextCursor,
    limite,
    retornados: events.length,
    hay_mas: hasMore,
    eventos: events,
  };
}
