import { getMcpReadOnlyDb } from "./mcp-db";

const MAX_LIMIT = 200;
const DEFAULT_SECONDS = 300;

function parseSeconds(value?: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(value as number) : DEFAULT_SECONDS, 1), 86400);
}

function parseLimit(value?: number) {
  return Math.min(Math.max(Number.isFinite(value) ? Math.floor(value as number) : 50, 1), MAX_LIMIT);
}

export async function toolKhoraEstadoVivo() {
  const db = getMcpReadOnlyDb();

  const [latestRes, windowRes, sessionRes, failureRes] = await Promise.all([
    db.query(
      `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
              sequence, session_id, release_sha, duration_ms, reason_code,
              correlacion_id, causation_id, attempt_id, cliente_en, servidor_en,
              detalle, metrics, event_hash
       FROM eventos_sistema
       ORDER BY id DESC
       LIMIT 1`
    ),
    db.query(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE estado = 'FAIL' OR detalle->'observation'->>'severity' IN ('ERROR','CRITICAL'))::int AS failures,
         count(*) FILTER (WHERE detalle->'observation'->>'severity' = 'WARN')::int AS warnings,
         count(DISTINCT session_id)::int AS sessions,
         max(servidor_en) AS last_server_event_at,
         max(cliente_en) AS last_client_event_at
       FROM eventos_sistema
       WHERE servidor_en >= NOW() - INTERVAL '5 minutes'`
    ),
    db.query(
      `SELECT session_id,
              max(servidor_en) AS last_seen,
              max(release_sha) AS release_sha,
              count(*)::int AS event_count
       FROM eventos_sistema
       WHERE servidor_en >= NOW() - INTERVAL '15 minutes'
         AND session_id IS NOT NULL
       GROUP BY session_id
       ORDER BY last_seen DESC
       LIMIT 20`
    ),
    db.query(
      `SELECT id, event_uuid, event_id, fase, estado, outcome, component,
              session_id, release_sha, duration_ms, reason_code,
              correlacion_id, cliente_en, servidor_en, detalle, metrics
       FROM eventos_sistema
       WHERE servidor_en >= NOW() - INTERVAL '60 minutes'
         AND (estado = 'FAIL' OR detalle->'observation'->>'severity' IN ('ERROR','CRITICAL') OR outcome = 'FAILURE')
       ORDER BY id DESC
       LIMIT 20`
    ),
  ]);

  const latest = latestRes.rows[0] || null;
  const window = windowRes.rows[0] || {
    total: 0, failures: 0, warnings: 0, sessions: 0,
    last_server_event_at: null, last_client_event_at: null,
  };

  const lastServer = latest?.servidor_en ? new Date(latest.servidor_en).getTime() : null;
  const lagMs = lastServer === null ? null : Math.max(0, Date.now() - lastServer);

  return {
    observado_en_utc: new Date().toISOString(),
    almacenamiento: {
      disponible: true,
      fuente: "eventos_sistema",
      modo: "solo_lectura",
    },
    actividad_ultimos_5_minutos: {
      total_eventos: Number(window.total || 0),
      fallos: Number(window.failures || 0),
      advertencias: Number(window.warnings || 0),
      sesiones: Number(window.sessions || 0),
      ultimo_evento_servidor: window.last_server_event_at,
      ultimo_evento_cliente: window.last_client_event_at,
      antiguedad_ultimo_evento_ms: lagMs,
    },
    ultima_observacion: latest,
    sesiones_activas_observadas: sessionRes.rows,
    fallos_ultimos_60_minutos: failureRes.rows,
    interpretacion_operativa:
      latest === null
        ? "No hay eventos persistidos todavía."
        : lagMs !== null && lagMs <= 120000
          ? "Hay actividad observada en tiempo reciente."
          : "La última observación persistida es antigua; no debe asumirse que el runtime siga activo.",
  };
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
    where.push(`detalle->'observation'->>'severity' = $${params.length}`);
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
    where.push(`detalle->'observation'->>'scope' = $${params.length}`);
  }
  if (args.category) {
    params.push(args.category);
    where.push(`detalle->'observation'->>'category' = $${params.length}`);
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
