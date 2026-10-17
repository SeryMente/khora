import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExperienceDelivery } from "../../lib/client/dictado-experience-delivery";
import { readSettings, sampleSession, POLICY, summarize, recordSchema, type ExperienceRecord } from "../../lib/contracts/dictado-experience";
const metrics = () => ({ duration_ms: 61000, first_result_ms: 10, resume_ready_ms: null, result_to_paint_ms: [10, 20], final_results: 1, reconnects: 0, protected_checks: 1, protected_changes: 0, visual_jumps: null, fidelity_error_rate: null, ended: true });
const record = (): ExperienceRecord => ({ id: randomUUID(), sessionId: randomUUID(), functionId: "dictado", clientRelease: null, policyVersion: POLICY.version, data: { kind: "session", metrics: metrics() } });
const deferred = () => { let done!: () => void; const promise = new Promise<void>(r => { done = r; }); return { promise, done }; };
test("preferencias corruptas y entradas numéricas no habilitan recopilación ni muestreo", () => {
  for (const value of [null, {}, { enabled: true, sampling: {} }, { enabled: true, sampling: { day: "", count: -1, last: 0 } }, { enabled: true, sampling: { day: "", count: 0, last: null } }]) assert.equal(readSettings(value).enabled, false);
  for (const value of [NaN, Infinity, -1]) assert.equal(sampleSession(value, { day: "", count: 0, last: 0 }, 1800000000000, "2026-10-16", 0).outcome, "ineligible");
  assert.equal(sampleSession(61000, { day: "", count: 0, last: 0 }, 1800000000000, "2026-10-16", NaN).outcome, "ineligible");
});
test("contrato rechaza más alteraciones que comprobaciones", () => {
  const r = record(); if (r.data.kind === "session") r.data.metrics.protected_changes = 2;
  assert.equal(recordSchema.safeParse(r).success, false);
});
test("resumen independiente del orden: reintentos y sesiones duplicadas no inflan muestras", () => {
  const r = record(), another = { ...r, id: randomUUID() };
  const values = [r, r, another];
  assert.equal(summarize(values).ended, 1); assert.equal(summarize(values).paintSamples, 2);
  assert.deepEqual(summarize(values), summarize([...values].reverse()));
  assert.equal(summarize([{ ...r, savedAt: new Date().toISOString() } as ExperienceRecord]).ended, 1);
});
test("resumen excluye conflictos en lugar de escoger el resultado favorable", () => {
  const r = record(), changed = structuredClone(r); if (changed.data.kind === "session") changed.data.metrics.protected_changes = 1;
  assert.equal(summarize([r, changed]).ended, 0);
  assert.equal(summarize([r, { ...changed, id: randomUUID() }]).conflictingSessions, 1);
});
test("entrega serializada: llamadas simultáneas y nuevos registros no se solapan", async () => {
  const gate = deferred(); let active = 0, peak = 0; const sent: string[] = [];
  const q = new ExperienceDelivery(async r => { peak = Math.max(peak, ++active); await gate.promise; sent.push(r.id); --active; }, () => true, () => "a");
  q.enqueue(record()); const first = q.flush(); assert.equal(q.flush(), first); q.enqueue(record()); gate.done();
  assert.equal(await first, true); assert.equal(peak, 1); assert.equal(sent.length, 2); assert.equal(q.size, 0);
});
test("fallo de red o acuse inválido conserva ID; reintento sin duplicar", async () => {
  let fail = true; const ids: string[] = [];
  const q = new ExperienceDelivery(async r => { ids.push(r.id); if (fail) throw new Error("offline"); }, () => true, () => "a");
  q.enqueue(record()); assert.equal(await q.flush(), false); assert.equal(q.size, 1);
  fail = false; assert.equal(await q.flush(), true); assert.equal(ids[0], ids[1]); assert.equal(q.size, 0);
});
test("cambio de perfil: acuse anterior no consume cola nueva ni cambia propietario", async () => {
  const gate = deferred(); let owner = "a"; const sent: string[] = [];
  const q = new ExperienceDelivery(async (_r, o) => { sent.push(o); await gate.promise; }, () => true, () => owner);
  q.enqueue(record()); const first = q.flush(); owner = "b"; q.reset(); q.enqueue(record()); gate.done();
  await first; assert.equal(q.size, 1); await q.flush(); assert.deepEqual(sent, ["a", "b"]);
});
test("captura ocupada pausa la entrega entre registros", async () => {
  let busy = false; let sent = 0;
  const q = new ExperienceDelivery(async () => { sent++; busy = true; }, () => !busy, () => "a");
  q.enqueue(record()); q.enqueue(record()); await q.flush(); assert.equal(sent, 1); assert.equal(q.size, 1);
  busy = false; await q.flush(); assert.equal(sent, 2);
});
test("cola acotada solo de metadatos; no admite comentario manual", () => {
  const q = new ExperienceDelivery(async () => {}, () => false, () => "a", 1);
  assert.equal(q.enqueue(record()), true); assert.equal(q.enqueue(record()), false);
  q.reset(); assert.equal(q.enqueue({ ...record(), data: { kind: "feedback", source: "voluntary", rating: null, reason: null, comment: "privado" } }), false);
});
test("benchmark invalida verde antes de huella y declara fallo si falta entrada", async () => {
  // Import the real runner; fake execution only inside a temporary fixture, never the product report.
  const { runBenchmark } = await import("../../scripts/benchmark-dictado.mjs");
  const dir = mkdtempSync(join(tmpdir(), "khora-benchmark-test-")); mkdirSync(join(dir, "lib/generated"), { recursive: true });
  const output = join(dir, "lib/generated/dictado-benchmark.json"); writeFileSync(output, '{"status":"passed"}');
  try { assert.equal(runBenchmark({ cwd: dir, sourceInputs: ["missing"] }), 1); assert.equal(JSON.parse(readFileSync(output, "utf8")).status, "failed"); assert.equal(existsSync(join(dir, ".dictado-benchmark.lock")), false); }
  finally { rmSync(dir, { recursive: true, force: true }); }
});
test("benchmark registra fallos de arranque y no ejecuta la etapa siguiente", async () => {
  const { runBenchmark } = await import("../../scripts/benchmark-dictado.mjs");
  const dir = mkdtempSync(join(tmpdir(), "khora-benchmark-test-")); let calls = 0;
  try {
    assert.equal(runBenchmark({ cwd: dir, sourceInputs: [], run: () => { calls++; return { status: null, error: new Error("spawn unavailable") }; } }), 1);
    const report = JSON.parse(readFileSync(join(dir, "lib/generated/dictado-benchmark.json"), "utf8"));
    assert.equal(report.status, "failed"); assert.equal(report.checks[1].status, "not_run"); assert.equal(calls, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
