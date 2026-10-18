import { createHash } from "node:crypto";
import type { ObservationRow } from "./model";
export const INTEGRITY_SCHEME = "khora-c14n-v2";
const ZERO = "0".repeat(64);
export function canonical(value: unknown): string {
  function ordered(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(ordered);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, ordered((v as ObservationRow)[k])]));
    return v;
  }
  return JSON.stringify(ordered(value));
}
/** V2 covers the persisted semantic fields, not DB id/server timestamp or administrative tampering. */
export function hashPersistedEvent(row: ObservationRow, previous: string): string {
  const fields = ["correlacion_id", "event_uuid", "fase", "event_id", "estado", "mensaje", "volcado_id", "version", "sha256", "sequence", "session_id", "detalle", "cliente_en", "idempotency_key", "schema_version", "outcome", "component", "causation_id", "attempt_id", "release_sha", "duration_ms", "metrics", "reason_code", "privacy_class"];
  const payload = Object.fromEntries(fields.map(k => [k, k === "cliente_en" && row[k] ? new Date(String(row[k])).toISOString() : row[k] ?? null]));
  return createHash("sha256").update(previous + canonical(payload), "utf8").digest("hex");
}
export function verifyChain(rows: ObservationRow[], truncated: boolean) {
  let broken = 0, verifiedPayloads = 0, legacy = 0;
  const rootPresent = rows.length > 0 && rows[0].hash_anterior === ZERO;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (i > 0 && r.hash_anterior !== rows[i - 1].event_hash) broken++;
    const detail = r.detalle as ObservationRow | null;
    if (detail?.__integrity_scheme === INTEGRITY_SCHEME) {
      if (hashPersistedEvent(r, String(r.hash_anterior)) !== r.event_hash) broken++;
      else verifiedPayloads++;
    } else legacy++;
  }
  const verdict = broken ? "BROKEN" : !rows.length ? "NO_EVIDENCE" : truncated || !rootPresent || legacy ? "PARTIAL" : "VERIFIED_SCOPE";
  return { verdict: verdict as "BROKEN" | "NO_EVIDENCE" | "PARTIAL" | "VERIFIED_SCOPE", checked: rows.length, broken, verifiedPayloads, legacy, truncated, rootPresent,
    scope: "Una correlación, máximo 500 eventos. V2 verifica contenido; legado solo enlaces. Sin anclaje externo ni garantía contra reescritura administrativa." };
}
export type IntegrityReport = ReturnType<typeof verifyChain>;
