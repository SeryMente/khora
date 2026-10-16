import test from "node:test";
import assert from "node:assert/strict";
import { POLICY, sampleSession, preservesPrefix, normalizedPrefix, quantile, recordSchema, summarize, type ExperienceRecord } from "../../lib/contracts/dictado-experience";
import { experienceOwner, saveExperience, readExperience, deleteExperience } from "../../lib/server/dictado-experience";
import { setDbForTesting } from "../../lib/server/neon";
import { esTextoCifrado } from "../../lib/server/cripto";
const state = { day: "2026-10-16", count: 0, last: 0 };
const now = 1_800_000_000_000;
const base = { id: "11111111-1111-4111-8111-111111111111", sessionId: "22222222-2222-4222-8222-222222222222", functionId: "dictado" as const, clientRelease: null, policyVersion: POLICY.version };
const feedback = (comment = "Prueba sintética, no dato de usuario."): ExperienceRecord => ({ ...base, data: { kind: "feedback", rating: null, reason: null, source: "voluntary", comment } });
test("muestreo: elegibilidad, frontera probabilística, topes y cambio de día", () => {
  assert.equal(sampleSession(59999, state, now, state.day, 0).outcome, "ineligible");
  assert.equal(sampleSession(60000, state, now, state.day, .24999).outcome, "selected");
  assert.equal(sampleSession(60000, state, now, state.day, .25).outcome, "not_selected");
  assert.equal(sampleSession(60000, { ...state, count: 2 }, now, state.day, 0).outcome, "capped");
  assert.equal(sampleSession(60000, { ...state, last: now - 1 }, now, "2026-10-17", 0).outcome, "capped");
  assert.equal(sampleSession(60000, { ...state, count: 2, last: now - POLICY.cooldownMs }, now, "2026-10-17", 0).outcome, "selected");
});
test("muestreo: distribución determinista y probabilidad registrada", () => {
  const choices = Array.from({ length: 1000 }, (_, i) => sampleSession(60000, state, now, state.day, i / 1000));
  assert.equal(choices.filter(c => c.outcome === "selected").length, 250);
  assert.ok(choices.every(c => c.probability === .25));
});
test("conservación: detecta sustitución de igual longitud, no solo caracteres", () => {
  assert.equal(preservesPrefix("Esto queda", "Esto queda\n\nY sigue"), true);
  assert.equal(preservesPrefix("Esto queda", "Otro queda"), false);
  assert.equal(normalizedPrefix("\n\nUno\n\nDos\n\n"), "Uno\n\nDos");
});
test("comentario manual sin valoración, límites y contrato cerrado", () => {
  assert.ok(recordSchema.safeParse(feedback()).success);
  assert.equal(recordSchema.safeParse(feedback("")).success, false);
  assert.equal(recordSchema.safeParse(feedback("x".repeat(1001))).success, false);
  assert.equal(recordSchema.safeParse({ ...feedback(), transcript: "no permitido" }).success, false);
  assert.equal(recordSchema.safeParse({ ...feedback(), data: { ...feedback().data, payload: "no permitido" } }).success, false);
});
test("resumen: cero datos no es cero fallos; fuentes y comentarios solos separados", () => {
  const empty = summarize([]); assert.equal(empty.paintP50, null); assert.equal(empty.protectedChecks, 0);
  assert.equal(empty.sampled.total, 0);
  const s = summarize([feedback(), { ...feedback(), id: crypto.randomUUID(), data: { kind: "feedback", source: "sampled", rating: "pleasant", reason: null, comment: "" } }]);
  assert.equal(s.sampled.pleasant, 1); assert.equal(s.voluntary.commentOnly, 1); assert.equal(s.voluntary.pleasant, 0);
  assert.equal(quantile([30, 10, 20], .5), 20); assert.equal(quantile([], .95), null);
});
test("propietario: identidad de servidor, rechazo anónimo y separación", () => {
  assert.equal(experienceOwner(null, "test-only-secret"), null);
  assert.notEqual(experienceOwner({ email: "a@example.test" }, "test-only-secret"), experienceOwner({ email: "b@example.test" }, "test-only-secret"));
  assert.equal(experienceOwner({ email: "A@EXAMPLE.TEST" }, "test-only-secret"), experienceOwner({ email: "a@example.test" }, "test-only-secret"));
});
test("almacenamiento: comentario cifrado, idempotencia, conflicto, aislamiento y borrado", async () => {
  const oldAuth = process.env.AUTH_SECRET; const oldKey = process.env.X_KHORA_KEY;
  process.env.AUTH_SECRET = "synthetic-test-auth-secret-not-production";
  process.env.X_KHORA_KEY = "synthetic-test-encryption-key-not-production";
  const rows: any[] = []; const calls: Array<{ sql: string; values: any[] }> = [];
  const db = { async query(sql: string, values: any[] = []) {
    calls.push({ sql, values });
    if (sql.startsWith("CREATE")) return { rows: [] };
    if (sql.startsWith("SELECT content_mac")) return { rows: rows.filter(r => r.owner === values[0] && r.id === values[1]).map(r => ({ content_mac: r.mac })) };
    if (sql.startsWith("SELECT count")) return { rows: [{ n: rows.filter(r => r.owner === values[0]).length }] };
    if (sql.startsWith("INSERT")) { rows.push({ owner: values[0], id: values[1], payload: JSON.parse(values[5]), comment_encrypted: values[6], mac: values[7], created_at: new Date() }); return { rows: [{ record_id: values[1] }] }; }
    if (sql.startsWith("SELECT payload")) return { rows: rows.filter(r => r.owner === values[0]) };
    if (sql.startsWith("DELETE") && !sql.includes("created_at")) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].owner === values[0]) rows.splice(i, 1); return { rows: [] }; }
    return { rows: [] };
  } };
  setDbForTesting(db);
  try {
    const r = feedback(); assert.equal(await saveExperience("owner-a", r), "saved");
    assert.equal(rows[0].payload.data.comment, ""); assert.ok(esTextoCifrado(rows[0].comment_encrypted));
    assert.equal(JSON.stringify(rows[0]).includes("Prueba sintética"), false);
    assert.equal(await saveExperience("owner-a", r), "duplicate");
    assert.equal(await saveExperience("owner-a", feedback("Otro comentario")), "conflict");
    assert.equal((await readExperience("owner-a")).records[0].data.kind, "feedback");
    const read = (await readExperience("owner-a")).records[0]; assert.equal(read.data.kind === "feedback" && read.data.comment, "Prueba sintética, no dato de usuario.");
    assert.equal((await readExperience("owner-b")).records.length, 0);
    await deleteExperience("owner-b"); assert.equal(rows.length, 1);
    await deleteExperience("owner-a"); assert.equal(rows.length, 0);
    assert.ok(calls.filter(c => /^(SELECT|DELETE)/.test(c.sql)).every(c => c.sql.includes("owner_key=$1")));
  } finally { if (oldAuth === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = oldAuth; if (oldKey === undefined) delete process.env.X_KHORA_KEY; else process.env.X_KHORA_KEY = oldKey; }
});

test("ruta HTTP real: autenticación, origen, cambio de perfil y privacidad", async () => {
  const ts = await import("typescript");
  const { readFileSync } = await import("node:fs");
  const { createRequire } = await import("node:module");
  const { NextRequest, NextResponse } = await import("next/server");
  const contracts = await import("../../lib/contracts/dictado-experience");
  const source = readFileSync("app/api/dictado-experience/route.ts", "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let user: { email: string } | undefined; const saves: string[] = []; const deletions: string[] = [];
  const oldSecret = process.env.AUTH_SECRET; process.env.AUTH_SECRET = "synthetic-http-route-auth-secret";
  const mockStore = { experienceOwner, RETENTION_DAYS: 90, saveExperience: async (owner: string) => { saves.push(owner); return "saved"; }, readExperience: async () => ({ records: [], truncated: false }), deleteExperience: async (owner: string) => { deletions.push(owner); } };
  const module = { exports: {} as any }; const req = createRequire(import.meta.url);
  const requireMock = (name: string) => name === "@/auth" ? { auth: async () => user ? { user } : null } : name === "next/server" ? { NextRequest, NextResponse } : name === "@/lib/contracts/dictado-experience" ? contracts : name === "@/lib/server/dictado-experience" ? mockStore : req(name);
  new Function("require", "module", "exports", js)(requireMock, module, module.exports);
  const route = module.exports;
  const request = (origin: string | null, profile: string, body: unknown = feedback()) => new NextRequest("https://khora.example.test/api/dictado-experience", { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}), "x-khora-experience-profile": profile }, body: JSON.stringify(body) });
  try {
    assert.equal((await route.GET()).status, 401);
    assert.equal((await route.POST(request("https://khora.example.test", ""))).status, 401);
    user = { email: "a@example.test" }; const ownerA = experienceOwner(user)!;
    assert.equal((await route.POST(request("https://evil.example.test", ownerA))).status, 403);
    assert.equal((await route.POST(request(null, ownerA))).status, 403);
    assert.equal((await route.POST(request("https://khora.example.test", "another-profile"))).status, 409);
    assert.equal((await route.POST(request("https://khora.example.test", ownerA, { ...feedback(), owner_key: "forged" }))).status, 400);
    const response = await route.POST(request("https://khora.example.test", ownerA));
    assert.equal(response.status, 200); assert.equal(saves[0], ownerA); assert.match(response.headers.get("cache-control") || "", /no-store/);
    user = { email: "b@example.test" };
    assert.equal((await route.POST(request("https://khora.example.test", ownerA))).status, 409); assert.equal(saves.length, 1);
    const del = new NextRequest("https://khora.example.test/api/dictado-experience", { method: "DELETE", headers: { origin: "https://khora.example.test", "x-khora-experience-profile": ownerA } });
    assert.equal((await route.DELETE(del)).status, 409); assert.equal(deletions.length, 0);
  } finally { if (oldSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = oldSecret; }
});
