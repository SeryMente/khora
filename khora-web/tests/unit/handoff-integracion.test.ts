import test from "node:test";
import assert from "node:assert/strict";
import { persistirHandoffIntegracion, type HandoffQueryable } from "../../lib/server/handoff-integracion.js";

const input = {
  intentId: "10dc7a9e-563c-4bd2-84a6-9e68f67c21fb",
  sessionId: "d3f2357e-2364-44cf-973f-f7f2b24643ab",
  volcadoId: "8ac26f30-df72-45c9-8d9a-e34f7c45d75a",
  version: 1,
  sourceSha256: "a".repeat(64),
  eventTime: "Hoy a las 09:30",
  capturedAt: "2026-11-15T17:30:00.000Z",
  owner: "authenticated-owner@example.invalid",
  autoPublish: true,
};

function fakeDatabase(): { client: HandoffQueryable; rows: any[]; inserts: number } {
  const rows: any[] = [];
  let inserts = 0;
  const client: HandoffQueryable = {
    async query(sql: string, values: any[] = []) {
      if (sql.includes("INSERT INTO integration_handoff")) {
        inserts += 1;
        const [intent_id, session_id, volcado_id, version, source_sha256, event_time, captured_at, state,
          auto_publish, publication_authorized, mode, representations, destinations, owner] = values;
        const existing = rows.find(row => row.intent_id === intent_id && row.session_id === session_id);
        if (existing) return { rows: [], rowCount: 0 };
        if (rows.some(row => row.session_id === session_id && row.volcado_id === volcado_id &&
          row.version === version && row.source_sha256 === source_sha256)) {
          const error: any = new Error("unique_source_version");
          error.code = "23505";
          throw error;
        }
        rows.push({
          intent_id, session_id, volcado_id, version, source_sha256, event_time,
          captured_at: new Date(captured_at), state, auto_publish, publication_authorized,
          mode, representations: JSON.parse(representations), destinations, owner,
        });
        return { rows: [{ intent_id }], rowCount: 1 };
      }
      if (sql.includes("SELECT intent_id")) {
        const row = rows.find(item => item.intent_id === values[0] && item.session_id === values[1]);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      throw new Error("unexpected_query");
    },
  };
  return { client, rows, get inserts() { return inserts; } };
}

test("checkmark activo crea handoff queued con autorización y destinos exactos", async () => {
  const db = fakeDatabase();
  const receipt = await persistirHandoffIntegracion(db.client, input);
  assert.equal(receipt.state, "queued");
  assert.equal(receipt.autoPublish, true);
  assert.equal(receipt.publicationAuthorized, true);
  assert.equal(receipt.owner, input.owner);
  assert.equal(receipt.eventTime, input.eventTime);
  assert.equal(receipt.capturedAt, input.capturedAt);
  assert.deepEqual(db.rows[0].representations, {
    cronica_sobria: true,
    microblog: { requested: true, max_characters: 280 },
  });
  assert.deepEqual(db.rows[0].destinations, ["github_blog", "facebook", "x", "tiktok"]);
});

test("checkmark desactivado asienta disabled y no autoriza ni encola publicación", async () => {
  const db = fakeDatabase();
  const receipt = await persistirHandoffIntegracion(db.client, { ...input, autoPublish: false });
  assert.equal(receipt.state, "disabled");
  assert.equal(receipt.autoPublish, false);
  assert.equal(receipt.publicationAuthorized, false);
  assert.deepEqual(db.rows[0].destinations, []);
  assert.deepEqual(db.rows[0].representations, {
    cronica_sobria: false,
    microblog: { requested: false, max_characters: 280 },
  });
});

test("reintento con intent_id + session_id devuelve el mismo asiento sin duplicarlo", async () => {
  const db = fakeDatabase();
  const first = await persistirHandoffIntegracion(db.client, input);
  const retry = await persistirHandoffIntegracion(db.client, input);
  assert.deepEqual(retry, first);
  assert.equal(db.rows.length, 1);
  assert.equal(db.inserts, 2);
});

test("una repetición no puede cambiar la autorización ya asentada", async () => {
  const db = fakeDatabase();
  await persistirHandoffIntegracion(db.client, input);
  await assert.rejects(
    () => persistirHandoffIntegracion(db.client, { ...input, autoPublish: false }),
    /integration_handoff_idempotency_conflict/,
  );
  assert.equal(db.rows.length, 1);
});

test("el mismo volcado/versión/SHA no acepta una intención alternativa duplicada", async () => {
  const db = fakeDatabase();
  await persistirHandoffIntegracion(db.client, input);
  await assert.rejects(
    () => persistirHandoffIntegracion(db.client, { ...input, intentId: "2dff89b6-6504-4e43-b6f2-9c5dbf26f2a4" }),
    /integration_handoff_persist_failed/,
  );
  assert.equal(db.rows.length, 1);
});

test("valida intención UUID, SHA de origen y capturedAt", async () => {
  const db = fakeDatabase();
  await assert.rejects(() => persistirHandoffIntegracion(db.client, { ...input, intentId: "bad-id" }), /invalid_intent_id/);
  await assert.rejects(() => persistirHandoffIntegracion(db.client, { ...input, sourceSha256: "bad" }), /invalid_source_sha256/);
  await assert.rejects(() => persistirHandoffIntegracion(db.client, { ...input, capturedAt: "yesterday" }), /invalid_captured_at/);
  assert.equal(db.rows.length, 0);
});
