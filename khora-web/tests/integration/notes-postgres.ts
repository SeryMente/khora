/**
 * Isolated PostgreSQL integration for 034_notes.sql and Notes API.
 * Uses embedded PGlite; never reads DATABASE_URL and never connects to Neon.
 * Run: node --import tsx --import ./tests/unit/setup.ts tests/integration/notes-postgres.ts
 */
import "../unit/setup";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { GET as listNotesRoute, POST as createNoteRoute } from "../../app/api/notes/route";
import { GET as getNoteRoute, PATCH as patchNoteRoute, DELETE as deleteNoteRoute } from "../../app/api/notes/[id]/route";
import { POST as noteActionRoute } from "../../app/api/notes/[id]/actions/route";
import { listNotes, noteListQuerySchema } from "../../lib/server/notes";

async function main() {
  const pg = new PGlite();
  let checks = 0;
  const query = async (sql: string, params?: any[]) => {
    if (!params?.length && sql.includes(";")) {
      const results = await pg.exec(sql);
      const result: any = results.at(-1) || { rows: [] };
      return { ...result, rowCount: result.affectedRows ?? result.rows.length };
    }
    const result = await pg.query(sql, params);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  };
  setDbForTesting({ query, connect: async () => ({ query, release() {} }) });

  try {
    await pg.exec("CREATE TABLE production_sentinel (id integer PRIMARY KEY, value text NOT NULL); INSERT INTO production_sentinel VALUES (1, 'untouched');");
    const migration = await readFile("db/migrations/034_notes.sql", "utf8");
    await pg.exec("BEGIN");
    await pg.exec(migration);
    await pg.exec("ROLLBACK");
    const rolledBack = await pg.query("SELECT to_regclass('public.khora_notes') AS table_name");
    assert.equal((rolledBack.rows[0] as { table_name: string | null }).table_name, null);
    checks++;
    const applyMigration = async () => {
      await pg.exec("BEGIN");
      try {
        await pg.exec(migration);
        await pg.exec("COMMIT");
      } catch (error) {
        await pg.exec("ROLLBACK");
        throw error;
      }
    };
    await applyMigration();
    await applyMigration();
    checks++;

    const seeded = await pg.query(
      "INSERT INTO khora_notes (id, user_id, mode, content, checklist_items, tags) VALUES ($1, $2, 'text', $3, '[]'::jsonb, $4) RETURNING id",
      ["00000000-0000-4000-8000-000000000001", "alice@example.com", "nota #proyecto/khora/notas", ["proyecto/khora/notas"]],
    );
    assert.equal(seeded.rows.length, 1);
    await pg.query(
      "INSERT INTO khora_notes (id, user_id, mode, content) VALUES ($1, $2, 'checklist', $3)",
      ["00000000-0000-4000-8000-000000000002", "bob@example.com", "privada"],
    );
    checks++;

    const alice = await pg.query("SELECT id, user_id FROM khora_notes WHERE user_id = $1", ["alice@example.com"]);
    assert.equal(alice.rows.length, 1);
    assert.equal((alice.rows[0] as { user_id: string }).user_id, "alice@example.com");
    const bob = await pg.query("SELECT id FROM khora_notes WHERE user_id = $1", ["bob@example.com"]);
    assert.equal(bob.rows.length, 1);
    checks++;

    const parentTagFilter = await listNotes("alice@example.com", noteListQuerySchema.parse({
      page: 1, pageSize: 40, status: "active", q: "", tag: "proyecto",
    }));
    assert.equal(parentTagFilter.total, 1);
    assert.deepEqual(parentTagFilter.items[0].tags, ["proyecto/khora/notas"]);
    assert.ok(parentTagFilter.tags.includes("proyecto/khora/notas"));
    checks++;

    // Exercise API with the authenticated test owner; client-supplied user_id is ignored.
    const createResponse = await createNoteRoute(new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_id: "attacker@example.com",
        mode: "checklist",
        content: "",
        checklist_items: [{ id: "task-1", text: "Revisar #seguridad/xss/escape", is_completed: false, position: 0 }],
        color: "blue",
        is_pinned: true,
      }),
    }));
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()).note;
    assert.equal(created.user_id, "test@example.com");
    assert.deepEqual(created.tags, ["seguridad/xss/escape"]);
    checks++;

    const listResponse = await listNotesRoute(new Request("http://localhost/api/notes?status=active&q=seguridad"));
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.equal(listed.total, 1);
    assert.equal(listed.items[0].id, created.id);
    checks++;

    const getResponse = await getNoteRoute(new Request("http://localhost/api/notes/" + created.id), { params: Promise.resolve({ id: created.id }) });
    assert.equal(getResponse.status, 200);
    const patchResponse = await patchNoteRoute(new Request("http://localhost/api/notes/" + created.id, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklist_items: [{ id: "task-1", text: "Revisar #seguridad/xss/escape", is_completed: true, position: 0 }] }),
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(patchResponse.status, 200);
    const updatedChecklist = (await patchResponse.json()).note;
    assert.equal(updatedChecklist.checklist_items[0].is_completed, true);
    const toTextResponse = await patchNoteRoute(new Request("http://localhost/api/notes/" + created.id, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "text" }),
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(toTextResponse.status, 200);
    const convertedText = (await toTextResponse.json()).note;
    assert.equal(convertedText.mode, "text");
    assert.equal(convertedText.content, "[x] Revisar #seguridad/xss/escape");
    assert.equal(convertedText.checklist_items.length, 0);
    const toChecklistResponse = await patchNoteRoute(new Request("http://localhost/api/notes/" + created.id, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "checklist" }),
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(toChecklistResponse.status, 200);
    const convertedChecklist = (await toChecklistResponse.json()).note;
    assert.equal(convertedChecklist.mode, "checklist");
    assert.equal(convertedChecklist.checklist_items[0].text, "Revisar #seguridad/xss/escape");
    assert.equal(convertedChecklist.checklist_items[0].is_completed, true);
    checks++;

    const crossUser = await getNoteRoute(new Request("http://localhost/api/notes/" + created.id), { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000002" }) });
    assert.equal(crossUser.status, 404);
    checks++;

    const archive = await noteActionRoute(new Request("http://localhost/api/notes/" + created.id + "/actions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive" }),
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(archive.status, 200);
    assert.equal((await archive.json()).note.status, "archived");

    const trash = await noteActionRoute(new Request("http://localhost/api/notes/" + created.id + "/actions", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "trash" }),
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(trash.status, 200);
    assert.equal((await trash.json()).note.status, "trashed");

    const noConfirmDelete = await deleteNoteRoute(new Request("http://localhost/api/notes/" + created.id, { method: "DELETE" }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(noConfirmDelete.status, 400);
    const confirmedDelete = await deleteNoteRoute(new Request("http://localhost/api/notes/" + created.id + "?confirm=true", { method: "DELETE" }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(confirmedDelete.status, 200);
    checks++;

    await query(
      "UPDATE khora_notes SET status = 'trashed', trashed_at = now() WHERE id = $1 AND user_id = $2",
      ["00000000-0000-4000-8000-000000000001", "alice@example.com"],
    );
    const trashed = await pg.query("SELECT status, trashed_at FROM khora_notes WHERE id = $1", ["00000000-0000-4000-8000-000000000001"]);
    const trashedRow = trashed.rows[0] as { status: string; trashed_at: Date | null };
    assert.equal(trashedRow.status, "trashed");
    assert.ok(trashedRow.trashed_at);
    checks++;

    const sentinel = await pg.query("SELECT value FROM production_sentinel WHERE id = 1");
    assert.equal((sentinel.rows[0] as { value: string }).value, "untouched");
    const indexes = await pg.query("SELECT indexname FROM pg_indexes WHERE tablename = 'khora_notes'");
    assert.ok(indexes.rows.some((row: any) => row.indexname === "khora_notes_tags_gin_idx"));
    checks++;

    // Pagination and query behavior over a dataset larger than the 100-note API cap.
    for (let index = 1; index <= 150; index++) {
      const id = "10000000-0000-4000-8000-" + String(index).padStart(12, "0");
      await pg.query(
        "INSERT INTO khora_notes (id, user_id, mode, content, checklist_items, tags) VALUES ($1, $2, 'text', $3, '[]'::jsonb, '{}')",
        [id, "perf@example.com", "nota de rendimiento " + index],
      );
    }
    const firstPage = await listNotes("perf@example.com", noteListQuerySchema.parse({ page: 1, pageSize: 40, status: "active", q: "" }));
    const lastPage = await listNotes("perf@example.com", noteListQuerySchema.parse({ page: 4, pageSize: 40, status: "active", q: "" }));
    assert.equal(firstPage.items.length, 40);
    assert.equal(firstPage.total, 150);
    assert.equal(firstPage.hasMore, true);
    assert.equal(lastPage.items.length, 30);
    assert.equal(lastPage.hasMore, false);
    checks++;

    console.log(JSON.stringify({ status: "PASS", checks, engine: "PostgreSQL/PGlite", migration: "034_notes.sql", api: true, repeatedApply: true, productionDatabase: false, productionDataTouched: false, paginationDataset: 150, pageSize: 40 }));
  } finally {
    resetDbForTesting();
    await pg.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
