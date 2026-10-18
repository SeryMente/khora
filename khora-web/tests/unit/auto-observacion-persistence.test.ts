import test from "node:test";
import assert from "node:assert/strict";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { registrarEventosBatch, procesarOutbox } from "../../lib/server/eventos";
import { registrarEventoServicio } from "../../lib/server/service-observability";
import { verifyChain } from "../../lib/auto-observacion/integrity";
function pool(options: { failInsert?: boolean; failOutbox?: boolean; duplicate?: boolean } = {}) {
  const inserts: unknown[][] = [], outbox: unknown[][] = [], updates: string[] = [];
  const client = { async query(sql: string, args: unknown[] = []) {
    if (sql.startsWith("SELECT id FROM eventos_sistema")) return { rows: options.duplicate ? [{ id: 1 }] : [] };
    if (sql.includes("SELECT event_hash")) return { rows: [] };
    if (sql.includes("INSERT INTO eventos_sistema")) { if (options.failInsert) throw new Error("Bearer fake-db-secret"); inserts.push(args); }
    return { rows: [], rowCount: 1 };
  }, release() {} };
  const db = { async connect() { return client; }, async query(sql: string, args: unknown[] = []) {
    if (sql.includes("INSERT INTO eventos_outbox")) { if (options.failOutbox) throw new Error("fictional-outbox-secret"); outbox.push(args); }
    if (sql.includes("UPDATE eventos_outbox")) updates.push(sql);
    if (sql.includes("SELECT id, event_uuid, payload")) return { rows: [{ id: 1, payload: { fase: "invalid" } }] };
    return { rows: [], rowCount: 1 };
  } };
  return { db, inserts, outbox, updates };
}
const event = { fase: "manejo" as const, eventId: "MAN-001", estado: "FAIL" as const, mensaje: "Synthetic failure", correlacionId: "00000000-0000-4000-8000-000000000001" };
test("legacy failure persisted as FAILURE and new payload hash survives DB JSON roundtrip", async () => {
  const p = pool(); setDbForTesting(p.db);
  try { const res = await registrarEventosBatch([event]); assert.equal(res.accepted, 1);
    const a = p.inserts[0]; assert.equal(a[15], "FAILURE");
    const fields = ["fase", "event_id", "estado", "mensaje", "detalle", "volcado_id", "version", "sha256", "correlacion_id", "cliente_en", "hash_anterior", "event_hash", "event_uuid", "idempotency_key", "schema_version", "outcome", "component", "causation_id", "attempt_id", "sequence", "session_id", "release_sha", "duration_ms", "metrics", "reason_code", "privacy_class"];
    const persisted = Object.fromEntries(fields.map((k, i) => [k, (k === "detalle" || k === "metrics") && a[i] ? JSON.parse(String(a[i])) : a[i]])); assert.equal(verifyChain([persisted], false).verdict, "VERIFIED_SCOPE");
  } finally { resetDbForTesting(); }
});
test("service partial is INFO, propagates outcome/component and metadata cannot override boundary", async () => {
  const p = pool(); setDbForTesting(p.db);
  try { await registrarEventoServicio({ service: "synthetic", operation: "test", outcome: "PARTIAL", durationMs: NaN, route: "/test?token=PRIVATE", metadata: { boundary: "spoof", token: "PRIVATE", attempt: 2 } });
    const a = p.inserts[0], detail = JSON.parse(String(a[4])); assert.equal(a[2], "INFO"); assert.equal(a[15], "PARTIAL"); assert.equal(a[16], "synthetic"); assert.equal(a[22], null); assert.equal(detail.boundary, "service"); assert.equal(detail.route, "/test"); assert.ok(!JSON.stringify(a).includes("PRIVATE"));
  } finally { resetDbForTesting(); }
});
test("invalid primitive entries are rejected without throwing", async () => { const p = pool(); setDbForTesting(p.db); try { const r = await registrarEventosBatch([null, 1, []] as never); assert.equal(r.rejected, 3); assert.equal(p.inserts.length, 0); } finally { resetDbForTesting(); } });
test("browser cannot spoof server source by supplying trusted-looking metadata", async () => { const p = pool(); setDbForTesting(p.db); try { await registrarEventosBatch([{ ...event, component: "server", detalle: { observation_source: "server_trusted" } }], null, "browser_reported"); const a = p.inserts[0]; assert.equal(a[16], "browser"); assert.equal(JSON.parse(String(a[4])).observation_source, "browser_reported"); } finally { resetDbForTesting(); } });
test("both sinks failing is NOT_PERSISTED, no raw DB error leaked", async () => { const p = pool({ failInsert: true, failOutbox: true }); setDbForTesting(p.db); try { const r = await registrarEventosBatch([event]); assert.equal(r.results[0].reason, "EVENT_NOT_PERSISTED"); assert.ok(!JSON.stringify(r).includes("fake-db-secret")); } finally { resetDbForTesting(); } });
test("outbox retains generated identity and sanitizes nested secret values", async () => { const p = pool({ failInsert: true }); setDbForTesting(p.db); try { const r = await registrarEventosBatch([{ ...event, detalle: { password: "PRIVATE" }, metrics: { token: "PRIVATE" } }]); assert.equal(r.results[0].reason, "EVENT_PENDING_OUTBOX"); const payload = JSON.parse(String(p.outbox[0][3])); assert.equal(payload.eventUuid, r.results[0].event_uuid); assert.equal(payload.correlacionId, event.correlacionId); assert.ok(!JSON.stringify(p.outbox).includes("PRIVATE")); assert.ok(!JSON.stringify(p.outbox).includes("fake-db-secret")); } finally { resetDbForTesting(); } });
test("duplicate identifiers don't insert again or claim payload equality", async () => { const p = pool({ duplicate: true }); setDbForTesting(p.db); try { const r = await registrarEventosBatch([event]); assert.equal(r.duplicates, 1); assert.equal(p.inserts.length, 0); assert.match(r.results[0].reason || "", /No certifica/); } finally { resetDbForTesting(); } });
test("exhausted outbox retries reach visible FAILED state", async () => { const p = pool(); setDbForTesting(p.db); try { const r = await procesarOutbox(); assert.equal(r.fallidos, 1); assert.match(p.updates[0], /retry_count \+ 1 >= 5 THEN 'FAILED'/); } finally { resetDbForTesting(); } });
