/** Auto-observación: bounded, payload-free public diagnostics. No React/server dependency. */
export const PHASES = ["dictado", "transcripcion", "revision", "manejo", "autorizacion", "ingesta", "grafo", "captura"] as const;
export type ObservationRow = Record<string, unknown>;
export function inferredOutcome(state: unknown): string {
  return ({ OK: "SUCCESS", FAIL: "FAILURE", START: "PENDING", SKIP: "SKIPPED", INFO: "PARTIAL" } as Record<string, string>)[String(state)] || "UNKNOWN";
}
export function finiteDuration(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(Math.min(value, 86400000)) : null;
}
export function parseFilters(params: URLSearchParams) {
  const phase = params.get("fase") || "";
  const correlation = params.get("correlacion_id") || "";
  const before = params.get("antes") || "";
  const limit = params.get("limite") || "100";
  if (phase && !(PHASES as readonly string[]).includes(phase)) throw new Error("INVALID_FILTER");
  if (correlation && !/^[a-zA-Z0-9_-]{1,128}$/.test(correlation)) throw new Error("INVALID_FILTER");
  if (before && !/^[1-9]\d{0,18}$/.test(before)) throw new Error("INVALID_CURSOR");
  if (!/^\d{1,3}$/.test(limit) || +limit < 1 || +limit > 200) throw new Error("INVALID_LIMIT");
  return { phase, correlation, before, limit: +limit, integrity: params.get("integridad") === "1" };
}
const SECRET = /(?:Bearer\s+\S+|(?:ghp_|github_pat_|vcp_|gsk_|ntn_|secret_)[A-Za-z0-9_-]+)/gi;
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[LIMIT]";
  if (typeof value === "string") return value.slice(0, 16000).replace(SECRET, "[REDACTED]");
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(x => redact(x, depth + 1));
  if (typeof value === "object" && value) return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, val]) => [key, /password|secret|token|authorization|cookie|api.?key|transcript|verbatim|audio|prompt/i.test(key) ? "[REDACTED]" : redact(val, depth + 1)]));
  return null;
}
export function safeIdentifier(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.:/-]{1,128}$/.test(value)) return null;
  if (SECRET.test(value)) { SECRET.lastIndex = 0; return null; }
  SECRET.lastIndex = 0;
  return value;
}
export function projectEvent(row: ObservationRow) {
  const detail = row.detalle && typeof row.detalle === "object" ? row.detalle as ObservationRow : {};
  const state = ["OK", "FAIL", "START", "INFO", "SKIP"].includes(String(row.estado)) ? String(row.estado) : "INFO";
  // Legacy outcome may incorrectly say SUCCESS. State is the compatibility truth; disclose discrepancy.
  const outcome = inferredOutcome(state);
  const phase = (PHASES as readonly string[]).includes(String(row.fase)) ? String(row.fase) : "desconocida";
  const source = detail.observation_source === "browser_reported" || row.component === "browser" ? "browser_reported" : "unattested";
  return {
    id: String(row.id), fase: phase, event_id: /^[A-Z]{3}-\d{3}$/.test(String(row.event_id)) ? String(row.event_id) : "LEGACY",
    estado: state, outcome, outcome_discrepancy: !!row.outcome && row.outcome !== outcome,
    correlacion_id: safeIdentifier(row.correlacion_id), servidor_en: validTime(row.servidor_en),
    component: safeIdentifier(row.component), duration_ms: finiteDuration(row.duration_ms),
    reason_code: safeIdentifier(row.reason_code), source,
    // No message, detail, metrics, session identifier, user data, raw hashes or tokens.
  };
}
export type SafeEvent = ReturnType<typeof projectEvent>;
function validTime(value: unknown): string | null {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function summarize(events: SafeEvent[]) {
  return { sample: events.length, failures: events.filter(e => e.estado === "FAIL").length,
    pending: events.filter(e => e.estado === "START").length,
    discrepancies: events.filter(e => e.outcome_discrepancy).length,
    operations: new Set(events.map(e => e.correlacion_id).filter(Boolean)).size };
}
export function groupOperations(events: SafeEvent[]) {
  const groups = new Map<string, SafeEvent[]>();
  for (const event of events) { const key = event.correlacion_id || `sin-correlacion-${event.id}`; groups.set(key, [...(groups.get(key) || []), event]); }
  return [...groups].map(([id, rows]) => ({ id, events: rows.length,
    // A sample without a terminal event is unresolved, never successful by absence of errors.
    state: rows.some(e => e.estado === "FAIL") ? "Fallo observado" : rows.some(e => e.estado === "START") ? "Pendiente / muestra parcial" : "Resultado no concluyente",
  }));
}
