import test from "node:test";
import assert from "node:assert/strict";
import {
  toolKhoraCustodiaCatalogo,
  toolKhoraCustodiaRevisiones,
  toolKhoraCustodiaVerificarIntegridad,
} from "../../lib/server/mcp-custodia";
import { cifrarTexto } from "../../lib/server/cripto";

process.env.X_KHORA_KEY = "synthetic-custodia-test-key-never-for-production";

function mockDb(handler: (sql: string, params?: any[]) => any) {
  const calls: Array<{ sql: string; params?: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      const result = await handler(sql, params);
      return result ?? { rows: [] };
    },
  };
}

test("catalog pages the complete owner session universe and excludes content", async () => {
  const db = mockDb((sql) => {
    if (sql.includes("SELECT count(*)::int AS total FROM dictado_session")) return { rows: [{ total: 2 }] };
    if (sql.includes("SELECT s.session_id")) return {
      rows: [
        {
          session_id: "session-open-without-checkpoint", estado: "uploading", total_partes: null,
          creado_en: "2026-10-30T10:00:00.000Z", actualizado_en: "2026-10-30T11:00:00.000Z",
          cerrado_en: null, volcado_id: null, folio: null, revision_id: null, revision_en: null,
          revisiones: 0, partes: 0, verificadas: 0, pendientes: 0, bytes: 0, mp3_estado: null,
          captura_completa: null, source_parts: null, mp3_en: null, actividad: "2026-10-30T11:00:00.000Z",
        },
        {
          session_id: "session-sealed", estado: "complete", total_partes: 2,
          creado_en: "2026-10-29T10:00:00.000Z", actualizado_en: "2026-10-29T11:00:00.000Z",
          cerrado_en: "2026-10-29T11:00:00.000Z",
          volcado_id: "00000000-0000-4000-8000-000000000001", folio: "folio-sealed",
          revision_id: null, revision_en: null, revisiones: 0, partes: 2, verificadas: 2,
          pendientes: 0, bytes: 2048, mp3_estado: null, captura_completa: null,
          source_parts: null, mp3_en: null, actividad: "2026-10-29T11:00:00.000Z",
        },
      ],
    };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaCatalogo("owner@example.test", { limite: 1 }, db);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sessionId, "session-open-without-checkpoint");
  assert.equal(result.items[0].revisionCount, 0);
  assert.equal(result.items[0].audio.storedParts, 0);
  assert.equal(result.page.totalItems, 2);
  assert.equal(result.page.hasMore, true);
  assert.ok(result.page.nextCursor);
  const pageQuery = db.calls.find(call => call.sql.includes("SELECT s.session_id"))!.sql;
  assert.match(pageQuery, /LEFT JOIN LATERAL/);
  assert.match(pageQuery, /LEFT JOIN dictado_mp3/);
  assert.match(pageQuery, /COALESCE\(s\.creado_en/);
  assert.doesNotMatch(pageQuery, /COALESCE\(s\.actualizado_en/);
  const serialized = JSON.stringify(result);
  for (const secret of ["private-title", "private-preview", "private-transcript", "blob.vercel-storage.com", "snapshot-ciphertext"]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test("catalog rejects invalid page bounds before querying", async () => {
  const db = mockDb(() => ({ rows: [] }));
  await assert.rejects(toolKhoraCustodiaCatalogo("owner@example.test", { limite: 101 }, db), /limite_invalido/);
  assert.equal(db.calls.length, 0);
});

test("revisions return counts and synchronization status without snapshot contents", async () => {
  const encryptedSnapshot = cifrarTexto(JSON.stringify({
    corteAudio: { hastaParte: 2 },
    audioPartes: [{ parte: 1 }, { parte: 2 }],
    titulo: "private-title",
    preview: "private-preview",
  }));
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [{ session_id: "session-1" }] };
    if (sql.includes("SELECT count(*)::int AS total FROM dictado_checkpoint")) return { rows: [{ total: 1 }] };
    if (sql.includes("SELECT revision_id::text")) return {
      rows: [{
        revision_id: "00000000-0000-4000-8000-000000000002",
        creado_en: "2026-10-30T11:00:00.000Z", client_at: 1793358000000, snapshot: encryptedSnapshot,
      }],
    };
    if (sql.includes("SELECT part_index,estado_verificacion")) return {
      rows: [
        { part_index: 1, estado_verificacion: "verificado" },
        { part_index: 2, estado_verificacion: "pendiente" },
      ],
    };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaRevisiones("owner@example.test", { session_id: "session-1" }, db);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].declaredParts, 2);
  assert.equal(result.items[0].storedParts, 2);
  assert.equal(result.items[0].verifiedParts, 1);
  assert.equal(result.items[0].syncStatus, "INTEGRITY_PENDING");
  const serialized = JSON.stringify(result);
  for (const secret of ["private-title", "private-preview", encryptedSnapshot]) assert.equal(serialized.includes(secret), false);
});

test("revisions refuse sessions outside the authenticated owner's scope", async () => {
  const db = mockDb(() => ({ rows: [] }));
  await assert.rejects(
    toolKhoraCustodiaRevisiones("owner@example.test", { session_id: "other-owner-session" }, db),
    /sesion_no_encontrada_o_no_autorizada/,
  );
  assert.equal(db.calls.length, 1);
});

test("integrity reads actual objects, returns sanitized states and clears decrypted buffers", async () => {
  const decrypted = Buffer.from("synthetic audio bytes");
  const digest = "a".repeat(64);
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [{ session_id: "session-1" }] };
    if (sql.includes("SELECT count(*)::int AS total FROM dictado_audio_parte")) return { rows: [{ total: 4 }] };
    if (sql.includes("SELECT part_index,bytes,sha256,blob_url")) return {
      rows: [
        { part_index: 1, bytes: decrypted.length, sha256: digest, blob_url: "https://private.blob.vercel-storage.com/object-1" },
        { part_index: 2, bytes: 10, sha256: digest, blob_url: "" },
        { part_index: 3, bytes: 10, sha256: digest, blob_url: "https://private.blob.vercel-storage.com/object-3" },
        { part_index: 4, bytes: 10, sha256: digest, blob_url: "https://private.blob.vercel-storage.com/object-4" },
      ],
    };
    return { rows: [] };
  });
  const readUrls: string[] = [];
  const result = await toolKhoraCustodiaVerificarIntegridad(
    "owner@example.test", { session_id: "session-1", limite: 4 }, db,
    async (url) => {
      readUrls.push(url);
      if (url.endsWith("object-3")) throw new Error("audio_integridad_rota");
      if (url.endsWith("object-4")) throw new Error("blob_no_encontrado");
      return decrypted;
    },
  );
  assert.equal(result.items[0].status, "VERIFIED");
  assert.equal(result.items[1].status, "MISSING");
  assert.equal(result.items[2].status, "MISMATCH");
  assert.equal(result.items[3].status, "MISSING");
  assert.equal(result.items[3].reason, "BLOB_NOT_FOUND");
  assert.deepEqual(readUrls, ["https://private.blob.vercel-storage.com/object-1", "https://private.blob.vercel-storage.com/object-3", "https://private.blob.vercel-storage.com/object-4"]);
  assert.ok(decrypted.every(byte => byte === 0));
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("blob.vercel-storage.com"), false);
  assert.equal(serialized.includes("synthetic audio bytes"), false);
  assert.equal(result.items.some((item: any) => Object.prototype.hasOwnProperty.call(item, "audio_base64")), false);
});

test("integrity classifies inaccessible objects as unverifiable, not proven missing", async () => {
  const db = mockDb((sql) => {
    if (sql.includes("SELECT s.session_id FROM dictado_session")) return { rows: [{ session_id: "session-1" }] };
    if (sql.includes("SELECT count(*)::int AS total FROM dictado_audio_parte")) return { rows: [{ total: 1 }] };
    if (sql.includes("SELECT part_index,bytes,sha256,blob_url")) return {
      rows: [{ part_index: 1, bytes: 12, sha256: "b".repeat(64), blob_url: "https://private.blob.vercel-storage.com/object" }],
    };
    return { rows: [] };
  });
  const result = await toolKhoraCustodiaVerificarIntegridad(
    "owner@example.test", { session_id: "session-1" }, db,
    async () => { throw new Error("blob_inaccesible"); },
  );
  assert.equal(result.items[0].status, "UNVERIFIABLE");
  assert.equal(result.items[0].reason, "BLOB_ACCESS_UNAVAILABLE_OR_TRANSIENT");
});
