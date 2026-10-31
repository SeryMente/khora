import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  toolKhoraCustodiaCatalogo,
  toolKhoraCustodiaRevisiones,
  toolKhoraCustodiaVerificarIntegridad,
} from "../../lib/server/mcp-custodia";
import { cifrarBytes, cifrarTexto } from "../../lib/server/cripto";
import { leerBlobVerificado } from "../../lib/server/audio-mp3";

process.env.X_KHORA_KEY = "synthetic-custodia-test-key-never-for-production";
process.env.MCP_JWT_SECRET = "synthetic-custodia-cursor-secret-never-for-production-32-bytes";

const ACTOR = "owner@example.test";
const SESSION = "session-1";
const REVISION_1 = "00000000-0000-4000-8000-000000000001";
const REVISION_2 = "00000000-0000-4000-8000-000000000002";
const FP_A = "a".repeat(32);
const FP_B = "b".repeat(32);

function mockDb(handler: (sql: string, params?: any[]) => any) {
  const calls: Array<{ sql: string; params?: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      return (await handler(sql, params)) ?? { rows: [] };
    },
  };
}

function sessionOwnerRow() {
  return { session_id: SESSION };
}

function catalogRow(sessionId: string, activity: string) {
  return {
    session_id: sessionId,
    estado: "uploading",
    total_partes: 3,
    creado_en: activity,
    actualizado_en: activity,
    cerrado_en: null,
    volcado_id: null,
    folio: null,
    effective_owner: ACTOR,
    actividad: activity,
    revision_id: null,
    revision_en: null,
    revision_sha256: null,
    revisiones: 0,
    revision_signature: "e".repeat(32),
    partes: 0,
    verificadas: 0,
    pendientes: 0,
    bytes: "0",
    part_signature: "f".repeat(32),
    mp3_estado: null,
    captura_completa: null,
    source_parts: null,
    mp3_en: null,
  };
}

function checkpoint(snapshot: unknown, createdAt = "2026-10-30T11:00:00.000Z", clientAt: number | null = 1793358000000) {
  return {
    revision_id: REVISION_1,
    creado_en: createdAt,
    client_at: clientAt,
    snapshot: cifrarTexto(JSON.stringify(snapshot)),
  };
}

function partRow(index: number, options: Partial<Record<"bytes" | "sha256" | "blob_url" | "estado_verificacion", any>> = {}) {
  return {
    part_index: index,
    stored_part_index: index,
    bytes: 5,
    sha256: createHash("sha256").update("part-" + index).digest("hex"),
    blob_url: "https://private-" + index + ".blob.vercel-storage.com/object",
    estado_verificacion: "pendiente",
    ...options,
  };
}

test("catalog pages owner universe with signed actor-bound cursor and drift fingerprint", async () => {
  const db = mockDb((_sql, params) => {
    assert.equal(params?.[0], ACTOR);
    const cursorActivity = params?.[1];
    if (!cursorActivity) {
      return { rows: [
        { total: 2, fingerprint: FP_A, ...catalogRow("session-a", "2026-10-30T12:00:00.000Z") },
        { total: 2, fingerprint: FP_A, ...catalogRow("session-b", "2026-10-30T11:00:00.000Z") },
      ] };
    }
    assert.equal(params?.[2], "session-a");
    return { rows: [
      { total: 2, fingerprint: FP_A, ...catalogRow("session-b", "2026-10-30T11:00:00.000Z") },
    ] };
  });
  const first = await toolKhoraCustodiaCatalogo(ACTOR, { limite: 1 }, db);
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].sessionId, "session-a");
  assert.equal(first.page.totalItems, 2);
  assert.equal(first.page.hasMore, true);
  assert.equal(first.page.fingerprintPinned, true);
  assert.ok(first.page.nextCursor?.includes("."));
  const second = await toolKhoraCustodiaCatalogo(ACTOR, { limite: 1, cursor: first.page.nextCursor! }, db);
  assert.equal(second.items[0].sessionId, "session-b");
  assert.equal(second.page.hasMore, false);
  assert.equal(second.page.nextCursor, null);
  const query = db.calls[0].sql;
  assert.match(query, /COALESCE\(s\.custodia_owner,s\.checkpoint_usuario,v\.usuario\)=\$1/);
  assert.match(query, /WITH owned AS/);
  assert.match(query, /summary AS/);
  assert.match(query, /page AS/);
  assert.match(query, /ORDER BY actividad DESC,session_id DESC/);
  assert.equal(db.calls.length, 2);
});

test("catalog rejects a cursor tampered or transferred to another actor before database access", async () => {
  const db = mockDb(() => ({ rows: [
    { total: 2, fingerprint: FP_A, ...catalogRow("session-a", "2026-10-30T12:00:00.000Z") },
    { total: 2, fingerprint: FP_A, ...catalogRow("session-b", "2026-10-30T11:00:00.000Z") },
  ] }));
  const first = await toolKhoraCustodiaCatalogo(ACTOR, { limite: 1 }, db);
  const token = first.page.nextCursor!;
  assert.ok(token.includes("."));
  const otherDb = mockDb(() => ({ rows: [] }));
  await assert.rejects(toolKhoraCustodiaCatalogo("other@example.test", { cursor: token }, otherDb), /cursor_invalido/);
  assert.equal(otherDb.calls.length, 0);
  const tampered = token.slice(0, -1) + (token.endsWith("x") ? "y" : "x");
  await assert.rejects(toolKhoraCustodiaCatalogo(ACTOR, { cursor: tampered }, otherDb), /cursor_invalido/);
  assert.equal(otherDb.calls.length, 0);
});

test("catalog detects metadata drift between pages rather than claiming a stable snapshot", async () => {
  const db = mockDb((_sql, params) => {
    if (!params?.[1]) return { rows: [
      { total: 2, fingerprint: FP_A, ...catalogRow("session-a", "2026-10-30T12:00:00.000Z") },
      { total: 2, fingerprint: FP_A, ...catalogRow("session-b", "2026-10-30T11:00:00.000Z") },
    ] };
    return { rows: [{ total: 2, fingerprint: FP_B, ...catalogRow("session-b", "2026-10-30T11:00:00.000Z") }] };
  });
  const page = await toolKhoraCustodiaCatalogo(ACTOR, { limite: 1 }, db);
  await assert.rejects(
    toolKhoraCustodiaCatalogo(ACTOR, { limite: 1, cursor: page.page.nextCursor! }, db),
    /catalogo_cambio_durante_paginacion/,
  );
});

test("catalog rejects invalid page sizes without a database query", async () => {
  const db = mockDb(() => ({ rows: [] }));
  for (const limite of [0, 101, 1.5, "20" as any]) {
    await assert.rejects(toolKhoraCustodiaCatalogo(ACTOR, { limite }, db), /limite_invalido/);
  }
  assert.equal(db.calls.length, 0);
});

test("revision metadata compares declared parts to table rows and distinguishes persisted vs client time", async () => {
  const savedAt = "2026-10-30T11:00:00.000Z";
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("WITH revisions AS")) return { rows: [{
      total: 1, fingerprint: FP_A, revision_id: REVISION_1, creado_en: savedAt,
      client_at: 1793358000000, snapshot: checkpoint({ corteAudio: { hastaParte: 3 } }).snapshot,
    }] };
    if (sql.includes("count(*) OVER() AS total_rows")) return { rows: [
      { part_index: 1, estado_verificacion: "verificado", total_rows: 2 },
      { part_index: 3, estado_verificacion: "pendiente", total_rows: 2 },
    ] };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaRevisiones(ACTOR, { session_id: SESSION }, db);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].savedAt, savedAt);
  assert.equal(result.items[0].savedAtSemantics, "hora de persistencia/recepción del servidor");
  assert.equal(result.items[0].clientAt, new Date(1793358000000).toISOString());
  assert.equal(result.items[0].manifest.declaredParts, 3);
  assert.equal(result.items[0].storedParts, 2);
  assert.equal(result.items[0].recordedVerifiedParts, 1);
  assert.equal(result.items[0].missingPartsFromTable, 1);
  assert.equal(result.items[0].syncStatus, "PARTS_MISSING_FROM_TABLE");
  assert.equal(result.items[0].recordedVerificationSemantics.includes("no implica relectura"), true);
  const serialized = JSON.stringify(result);
  for (const blocked of ["private-title", "transcript", "{\"corteAudio\":", "\"audioPartes\":", "https://private"]) {
    assert.equal(serialized.includes(blocked), false, blocked);
  }
  assert.ok(result.items.every((item: any) => item.snapshotContentsReturned === false));
});

test("revision page cursors bind to actor and session and detect a changed revision set", async () => {
  const db = mockDb((sql, params) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("WITH revisions AS")) {
      const cursor = params?.[2];
      return { rows: cursor ? [
        { total: 2, fingerprint: FP_A, revision_id: REVISION_2, creado_en: "2026-10-29T11:00:00.000Z", client_at: 1, snapshot: checkpoint({audioPartes: []}).snapshot },
      ] : [
        { total: 2, fingerprint: FP_A, revision_id: REVISION_1, creado_en: "2026-10-30T11:00:00.000Z", client_at: 1, snapshot: checkpoint({audioPartes: []}).snapshot },
        { total: 2, fingerprint: FP_A, revision_id: REVISION_2, creado_en: "2026-10-29T11:00:00.000Z", client_at: 1, snapshot: checkpoint({audioPartes: []}).snapshot },
      ] };
    }
    if (sql.includes("count(*) OVER() AS total_rows")) return { rows: [] };
    return { rows: [] };
  });
  const first = await toolKhoraCustodiaRevisiones(ACTOR, { session_id: SESSION, limite: 1 }, db);
  assert.equal(first.page.hasMore, true);
  const second = await toolKhoraCustodiaRevisiones(ACTOR, { session_id: SESSION, limite: 1, cursor: first.page.nextCursor! }, db);
  assert.equal(second.items[0].revisionId, REVISION_2);
  assert.equal(second.page.hasMore, false);
  await assert.rejects(
    toolKhoraCustodiaRevisiones("different@example.test", { session_id: SESSION, cursor: first.page.nextCursor! }, db),
    /cursor_invalido/,
  );
});

test("revisions deny session belonging to another actor without reading its snapshots", async () => {
  const db = mockDb((_sql, params) => params?.[1] === ACTOR ? { rows: [sessionOwnerRow()] } : { rows: [] });
  await assert.rejects(toolKhoraCustodiaRevisiones("other@example.test", { session_id: SESSION }, db), /sesion_no_encontrada_o_no_autorizada/);
  assert.equal(db.calls.length, 1);
});

test("integrity compares the declared 1-based manifest with table rows and verifies actual Blob bytes", async () => {
  const payload1 = Buffer.from("part-1");
  const payload3 = Buffer.from("part-3");
  const db = mockDb((sql, params) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("SELECT revision_id::text,creado_en,snapshot")) return { rows: [checkpoint({ corteAudio: { hastaParte: 4 } })] };
    if (sql.includes("WITH expected AS")) {
      const start = params?.[1];
      const end = params?.[2];
      const rows: any[] = [{ stored_total: 3, invalid_indexes: 0, extra_parts: 0 }];
      for (let index = start; index <= end; index++) {
        if (index === 1) rows.push({ stored_total: 3, invalid_indexes: 0, extra_parts: 0, part_index: 1, stored_part_index: 1, bytes: payload1.length, sha256: createHash("sha256").update(payload1).digest("hex"), blob_url: "https://one.blob.vercel-storage.com/o", estado_verificacion: "verificado" });
        else if (index === 2) rows.push({ stored_total: 3, invalid_indexes: 0, extra_parts: 0, part_index: 2, stored_part_index: null, bytes: null, sha256: null, blob_url: null, estado_verificacion: null });
        else if (index === 3) rows.push({ stored_total: 3, invalid_indexes: 0, extra_parts: 0, part_index: 3, stored_part_index: 3, bytes: payload3.length, sha256: "f".repeat(64), blob_url: "https://three.blob.vercel-storage.com/o", estado_verificacion: "pendiente" });
        else rows.push({ stored_total: 3, invalid_indexes: 0, extra_parts: 0, part_index: 4, stored_part_index: 4, bytes: 0, sha256: null, blob_url: "", estado_verificacion: "pendiente" });
      }
      return { rows };
    }
    return { rows: [] };
  });
  const seen: string[] = [];
  const result = await toolKhoraCustodiaVerificarIntegridad(ACTOR, { session_id: SESSION, limite: 2 }, db, async (url, bytes, sha) => {
    seen.push(url);
    if (url.includes("three")) throw new Error("audio_integridad_rota");
    return payload1;
  });
  assert.equal(result.manifest.status, "DECLARED");
  assert.equal(result.manifest.declaredParts, 4);
  assert.deepEqual(result.items.map((item: any) => item.partIndex), [1, 2]);
  assert.equal(result.items[0].status, "VERIFIED");
  assert.equal(result.items[0].registration, "REGISTERED");
  assert.equal(result.items[1].status, "MISSING");
  assert.equal(result.items[1].registration, "ABSENT_FROM_TABLE");
  assert.equal(result.page.hasMore, true);
  assert.equal(result.page.nextAfterPart, 2);
  assert.deepEqual(seen, ["https://one.blob.vercel-storage.com/o"]);
  const next = await toolKhoraCustodiaVerificarIntegridad(ACTOR, { session_id: SESSION, limite: 2, despues_de_parte: 2 }, db, async (url) => {
    if (url.includes("three")) throw new Error("audio_integridad_rota");
    throw new Error("blob_inaccesible");
  });
  assert.deepEqual(next.items.map((item: any) => item.partIndex), [3, 4]);
  assert.equal(next.items[0].status, "MISMATCH");
  assert.equal(next.items[1].status, "MISSING");
  assert.equal(next.items[1].reason, "BLOB_REFERENCE_MISSING");
  assert.equal(next.page.hasMore, false);
  assert.equal(next.summary.registeredPartsTotal, 3);
  assert.equal(next.summary.unexpectedStoredParts, 0);
  const serialized = JSON.stringify([result, next]);
  for (const blocked of ["https://one.blob.vercel-storage.com", "https://three.blob.vercel-storage.com", "synthetic-private-session", "part-1", "part-3"]) {
    assert.equal(serialized.includes(blocked), false, blocked);
  }
  payload1.fill(0);
  payload3.fill(0);
});

test("integrity distinguishes transient Blob failures from missing and mismatched objects", async () => {
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("SELECT revision_id::text,creado_en,snapshot")) return { rows: [checkpoint({ corteAudio: { hastaParte: 1 } })] };
    if (sql.includes("WITH expected AS")) return { rows: [
      { stored_total: 1, invalid_indexes: 0, extra_parts: 0, part_index: 1, stored_part_index: 1, bytes: 10, sha256: "c".repeat(64), blob_url: "https://one.blob.vercel-storage.com/o", estado_verificacion: "pendiente" },
    ] };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaVerificarIntegridad(ACTOR, { session_id: SESSION }, db, async () => { throw new Error("blob_inaccesible"); });
  assert.equal(result.items[0].status, "UNVERIFIABLE");
  assert.equal(result.items[0].reason, "BLOB_ACCESS_UNAVAILABLE_OR_TRANSIENT");
  assert.equal(result.items[0].blobRead, "FAILED");
});

test("integrity will not invent declared part count when snapshot is unreadable", async () => {
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("SELECT revision_id::text,creado_en,snapshot")) return { rows: [{ snapshot: "khc1.corrupt" }] };
    if (sql.includes("SELECT part_index,part_index AS stored_part_index")) return { rows: [
      { part_index: 1, stored_part_index: 1, bytes: 10, sha256: "d".repeat(64), blob_url: "https://one.blob.vercel-storage.com/o", estado_verificacion: "verificado", total_rows: 1 },
    ] };
    if (sql.includes("SELECT count(*) FILTER(WHERE part_index<1)")) return { rows: [{ invalid_indexes: 0 }] };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaVerificarIntegridad(ACTOR, { session_id: SESSION }, db, async () => { throw new Error("blob_inaccesible"); });
  assert.equal(result.manifest.status, "UNREADABLE");
  assert.equal(result.manifest.declaredParts, null);
  assert.equal(result.page.basis, "registered_rows");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, "UNVERIFIABLE");
});

test("integrity rejects continuation beyond explicit declared manifest", async () => {
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [sessionOwnerRow()] };
    if (sql.includes("SELECT revision_id::text,creado_en,snapshot")) return { rows: [checkpoint({ corteAudio: { hastaParte: 2 } })] };
    return { rows: [] };
  });
  await assert.rejects(toolKhoraCustodiaVerificarIntegridad(ACTOR, { session_id: SESSION, despues_de_parte: 3 }, db), /cursor_fuera_de_rango/);
});

test("Blob reader validates host, redirect policy, decrypts and verifies SHA-256; clears encrypted copy", async () => {
  const originalFetch = globalThis.fetch;
  const clear = Buffer.from("synthetic Blob bytes");
  const encrypted = cifrarBytes(clear);
  const digest = createHash("sha256").update(clear).digest("hex");
  let options: any = null;
  globalThis.fetch = (async (_url: any, init: any) => {
    options = init;
    return new Response(Buffer.from(encrypted), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await leerBlobVerificado("https://file.blob.vercel-storage.com/audio", clear.length, digest);
    assert.deepEqual(result, clear);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    result.fill(0);
  } finally {
    globalThis.fetch = originalFetch;
    encrypted.fill(0);
    clear.fill(0);
  }
});

test("Blob reader rejects disallowed hosts and maps provider 404 separately from transient failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    await assert.rejects(leerBlobVerificado("http://evil.example/object", 4, "e".repeat(64)), /blob_host_no_permitido/);
    assert.equal(calls, 0);
    await assert.rejects(leerBlobVerificado("https://file.blob.vercel-storage.com/object", 4, "e".repeat(64)), /blob_no_encontrado/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
