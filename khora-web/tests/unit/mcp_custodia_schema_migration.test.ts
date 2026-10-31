import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { assertCustodiaReadOnlyRole } from "../../lib/server/mcp-custodia";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(webRoot, "db/migrations/034_custodia_mcp_read_contract.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const loader = fs.readFileSync(path.join(webRoot, "scripts/migrate-runtime.mjs"), "utf8");

async function fixture(preexisting: boolean): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE khora_lector NOLOGIN;
    CREATE ROLE khora_readonly_test LOGIN;
    GRANT khora_lector TO khora_readonly_test;
    CREATE TABLE public.volcado (
      id UUID PRIMARY KEY,
      folio TEXT,
      usuario TEXT,
      session_id TEXT UNIQUE,
      payload TEXT
    );
  `);

  if (preexisting) {
    await db.exec(`
      CREATE TABLE public.dictado_session (
        session_id TEXT PRIMARY KEY,
        volcado_id UUID REFERENCES public.volcado(id) ON DELETE SET NULL,
        estado TEXT NOT NULL DEFAULT 'uploading',
        total_partes INTEGER,
        duracion_seg INTEGER,
        creado_en TIMESTAMPTZ DEFAULT now(),
        cerrado_en TIMESTAMPTZ,
        actualizado_en TIMESTAMPTZ DEFAULT now()
      );
      CREATE UNIQUE INDEX dictado_session_volcado_id_uniq
        ON public.dictado_session(volcado_id) WHERE volcado_id IS NOT NULL;
      CREATE TABLE public.dictado_audio_parte (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL REFERENCES public.dictado_session(session_id) ON DELETE CASCADE,
        volcado_id UUID REFERENCES public.volcado(id) ON DELETE SET NULL,
        part_index INTEGER NOT NULL,
        blob_url TEXT NOT NULL,
        blob_path TEXT,
        bytes INTEGER NOT NULL,
        sha256 TEXT,
        estado TEXT NOT NULL DEFAULT 'uploaded',
        uploaded_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT dictado_audio_parte_session_part_uniq UNIQUE(session_id, part_index)
      );
      CREATE INDEX dictado_audio_parte_session_id_idx ON public.dictado_audio_parte(session_id);
      CREATE INDEX dictado_audio_parte_volcado_id_idx ON public.dictado_audio_parte(volcado_id);
      INSERT INTO public.volcado(id, folio, usuario, session_id, payload)
      VALUES ('00000000-0000-4000-8000-000000000001', 'F-LEGACY', 'legacy@example.test', 'legacy-session', 'synthetic-only');
      INSERT INTO public.dictado_session(session_id, volcado_id, estado, total_partes)
      VALUES ('legacy-session', '00000000-0000-4000-8000-000000000001', 'complete', 1);
      INSERT INTO public.dictado_audio_parte(session_id, volcado_id, part_index, blob_url, bytes, sha256)
      VALUES ('legacy-session', '00000000-0000-4000-8000-000000000001', 1,
        'https://synthetic.blob.vercel-storage.com/legacy', 4, repeat('a', 64));
      GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE
        ON public.dictado_session, public.dictado_audio_parte, public.volcado TO khora_lector;
      GRANT SELECT (payload) ON public.volcado TO khora_lector;
    `);
  }
  return db;
}

async function applyMigrationTwice(db: PGlite) {
  await db.exec(migration);
  // Emulate historical grants that may already exist on an upgraded database.
  await db.exec(`
    GRANT SELECT ON TABLE public.dictado_checkpoint TO PUBLIC;
    GRANT SELECT (texto) ON TABLE public.dictado_checkpoint TO PUBLIC;
    GRANT INSERT (session_id) ON TABLE public.dictado_session TO PUBLIC;
  `);
  await db.exec(migration);
}

async function assertReadOnlyGrants(db: PGlite) {
  await db.exec("SET ROLE khora_readonly_test");
  await assertCustodiaReadOnlyRole(db as any);
  const privileges = await db.query(`
    SELECT
      has_column_privilege(current_user, 'public.dictado_session', 'session_id', 'SELECT') AS session_id_select,
      has_column_privilege(current_user, 'public.dictado_session', 'custodia_owner', 'SELECT') AS owner_select,
      has_column_privilege(current_user, 'public.dictado_audio_parte', 'blob_url', 'SELECT') AS parts_blob_select,
      has_column_privilege(current_user, 'public.dictado_checkpoint', 'snapshot', 'SELECT') AS checkpoint_snapshot_select,
      has_column_privilege(current_user, 'public.dictado_mp3', 'estado', 'SELECT') AS mp3_estado_select,
      has_column_privilege(current_user, 'public.volcado', 'id', 'SELECT') AS archive_id_select,
      has_table_privilege(current_user, 'public.dictado_session', 'SELECT') AS session_table_select,
      has_table_privilege(current_user, 'public.dictado_audio_parte', 'SELECT') AS parts_table_select,
      has_table_privilege(current_user, 'public.dictado_checkpoint', 'SELECT') AS checkpoint_table_select,
      has_table_privilege(current_user, 'public.dictado_mp3', 'SELECT') AS mp3_table_select,
      has_table_privilege(current_user, 'public.volcado', 'SELECT') AS archive_table_select,
      has_column_privilege(current_user, 'public.dictado_session', 'checkpoint_text', 'SELECT') AS session_text_select,
      has_column_privilege(current_user, 'public.dictado_audio_parte', 'blob_path', 'SELECT') AS parts_path_select,
      has_column_privilege(current_user, 'public.dictado_checkpoint', 'texto', 'SELECT') AS checkpoint_text_select,
      has_column_privilege(current_user, 'public.dictado_mp3', 'ultimo_error', 'SELECT') AS mp3_error_select,
      has_column_privilege(current_user, 'public.volcado', 'payload', 'SELECT') AS archive_payload_select,
      has_any_column_privilege(current_user, 'public.dictado_session', 'INSERT') AS session_insert,
      has_any_column_privilege(current_user, 'public.dictado_audio_parte', 'UPDATE') AS parts_update,
      has_table_privilege(current_user, 'public.dictado_checkpoint', 'DELETE') AS checkpoint_delete,
      has_table_privilege(current_user, 'public.dictado_mp3', 'TRUNCATE') AS mp3_truncate,
      has_any_column_privilege(current_user, 'public.volcado', 'INSERT') AS archive_any_insert,
      (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS is_superuser
  `);
  const row = privileges.rows[0] as Record<string, boolean>;
  for (const key of ["session_id_select", "owner_select", "parts_blob_select", "checkpoint_snapshot_select", "mp3_estado_select", "archive_id_select"]) {
    assert.equal(row[key], true, key);
  }
  for (const key of [
    "session_table_select", "parts_table_select", "checkpoint_table_select", "mp3_table_select", "archive_table_select",
    "session_text_select", "parts_path_select", "checkpoint_text_select", "mp3_error_select", "archive_payload_select",
  ]) {
    assert.equal(row[key], false, key + " must stay outside the read contract");
  }
  for (const key of ["session_insert", "parts_update", "checkpoint_delete", "mp3_truncate", "archive_any_insert", "is_superuser"]) {
    assert.equal(row[key], false, key);
  }
  await assert.rejects(
    db.query("INSERT INTO public.dictado_session(session_id) VALUES ('forbidden-write')"),
    /permission denied/i,
  );
  await assert.rejects(
    db.query("SELECT payload FROM public.volcado"),
    /permission denied/i,
  );
  await db.exec("RESET ROLE");
}

async function assertForeignKeyRetention(db: PGlite, suffix: string) {
  const volcadoId = suffix === "fresh"
    ? "00000000-0000-4000-8000-000000000010"
    : "00000000-0000-4000-8000-000000000011";
  const sessionId = "retention-" + suffix;
  await db.query(
    "INSERT INTO public.volcado(id,folio,usuario,session_id,payload) VALUES($1,$2,$3,$4,$5)",
    [volcadoId, "F-" + suffix, "owner@example.test", sessionId, "synthetic-only"],
  );
  await db.query(
    "INSERT INTO public.dictado_session(session_id,volcado_id,estado) VALUES($1,$2,'complete')",
    [sessionId, volcadoId],
  );
  await db.query(
    "INSERT INTO public.dictado_audio_parte(session_id,volcado_id,part_index,blob_url,bytes,sha256) VALUES($1,$2,1,$3,4,$4)",
    [sessionId, volcadoId, "https://synthetic.blob.vercel-storage.com/" + suffix, "a".repeat(64)],
  );
  await db.query(
    "INSERT INTO public.dictado_checkpoint(revision_id,session_id,usuario,client_at,texto,sha256,snapshot) VALUES($1,$2,$3,1,'synthetic','b','{}')",
    [suffix === "fresh" ? "00000000-0000-4000-8000-000000000020" : "00000000-0000-4000-8000-000000000021", sessionId, "owner@example.test"],
  );
  await db.query(
    "INSERT INTO public.dictado_mp3(session_id,estado) VALUES($1,'pendiente')",
    [sessionId],
  );

  await db.query("DELETE FROM public.volcado WHERE id=$1", [volcadoId]);
  const detached = await db.query(
    "SELECT s.volcado_id AS session_archive, p.volcado_id AS part_archive " +
    "FROM public.dictado_session s JOIN public.dictado_audio_parte p ON p.session_id=s.session_id WHERE s.session_id=$1",
    [sessionId],
  );
  assert.equal(detached.rows.length, 1);
  assert.equal((detached.rows[0] as any).session_archive, null);
  assert.equal((detached.rows[0] as any).part_archive, null);

  await assert.rejects(
    db.query("DELETE FROM public.dictado_session WHERE session_id=$1", [sessionId]),
    /foreign key constraint/i,
  );
  await db.query("DELETE FROM public.dictado_checkpoint WHERE session_id=$1", [sessionId]);
  await db.query("DELETE FROM public.dictado_mp3 WHERE session_id=$1", [sessionId]);
  await db.query("DELETE FROM public.dictado_session WHERE session_id=$1", [sessionId]);

  const cascaded = await db.query(
    "SELECT count(*)::int AS total FROM public.dictado_audio_parte WHERE session_id=$1",
    [sessionId],
  );
  assert.equal((cascaded.rows[0] as any).total, 0);
}

async function assertConstraintActions(db: PGlite) {
  const result = await db.query(`
    SELECT c.conrelid::regclass::text AS table_name, c.confrelid::regclass::text AS parent_table,
      c.confdeltype AS delete_action
    FROM pg_catalog.pg_constraint c
    WHERE c.contype='f'
      AND c.conrelid IN (
        'public.dictado_session'::regclass,
        'public.dictado_audio_parte'::regclass,
        'public.dictado_checkpoint'::regclass,
        'public.dictado_mp3'::regclass
      )
  `);
  const action = (table: string, parent: string) =>
    (result.rows as any[]).find((row: any) => row.table_name === table && row.parent_table === parent)?.delete_action;
  assert.equal(action("dictado_audio_parte", "dictado_session"), "c");
  assert.equal(action("dictado_session", "volcado"), "n");
  assert.equal(action("dictado_audio_parte", "volcado"), "n");
  assert.equal(action("dictado_checkpoint", "dictado_session"), "a");
  assert.equal(action("dictado_mp3", "dictado_session"), "a");
}

test("034 executes on a new PostgreSQL schema, is idempotent, and grants only the read contract", async () => {
  const db = await fixture(false);
  try {
    await applyMigrationTwice(db);
    await assertReadOnlyGrants(db);
    await assertConstraintActions(db);
    await assertForeignKeyRetention(db, "fresh");
  } finally {
    await db.close();
  }
});

test("034 upgrades a preexisting Dictado schema without rewriting existing records", async () => {
  const db = await fixture(true);
  try {
    const before = await db.query("SELECT session_id,volcado_id,total_partes FROM public.dictado_session WHERE session_id='legacy-session'");
    assert.equal(before.rows.length, 1);
    await applyMigrationTwice(db);
    const after = await db.query(`
      SELECT s.session_id,s.volcado_id,s.total_partes,s.custodia_owner,
        p.part_index,p.blob_url,p.fuente_audio,p.estado_verificacion
      FROM public.dictado_session s
      JOIN public.dictado_audio_parte p ON p.session_id=s.session_id
      WHERE s.session_id='legacy-session'
    `);
    assert.equal(after.rows.length, 1);
    assert.equal((after.rows[0] as any).session_id, "legacy-session");
    assert.equal((after.rows[0] as any).volcado_id, "00000000-0000-4000-8000-000000000001");
    assert.equal((after.rows[0] as any).total_partes, 1);
    assert.equal((after.rows[0] as any).custodia_owner, null);
    assert.equal((after.rows[0] as any).part_index, 1);
    assert.equal((after.rows[0] as any).blob_url, "https://synthetic.blob.vercel-storage.com/legacy");
    assert.equal((after.rows[0] as any).fuente_audio, "microphone");
    assert.equal((after.rows[0] as any).estado_verificacion, "pendiente");
    await assertReadOnlyGrants(db);
    await assertConstraintActions(db);
    await assertForeignKeyRetention(db, "legacy");
  } finally {
    await db.close();
  }
});

test("effective-role guard rejects privileged DATABASE_URL fallback and unrelated login roles", async () => {
  const db = await fixture(false);
  try {
    await db.exec(migration);
    await assert.rejects(assertCustodiaReadOnlyRole(db as any), /custodia_readonly_role_invalid/);
    await db.exec("CREATE ROLE khora_unrelated_login LOGIN");
    await db.exec("SET ROLE khora_unrelated_login");
    await assert.rejects(assertCustodiaReadOnlyRole(db as any), /custodia_readonly_role_invalid/);
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

test("effective-role guard rejects DML privileges outside the Custodia tables", async () => {
  const db = await fixture(false);
  try {
    await db.exec(migration);
    await db.exec("CREATE TABLE public.unrelated_write_surface(id INTEGER)");
    await db.exec("GRANT INSERT ON public.unrelated_write_surface TO khora_lector");
    await db.exec("CREATE SEQUENCE public.unrelated_write_sequence");
    await db.exec("GRANT USAGE, UPDATE ON SEQUENCE public.unrelated_write_sequence TO khora_lector");
    await db.exec("SET ROLE khora_readonly_test");
    await assert.rejects(assertCustodiaReadOnlyRole(db as any), /custodia_readonly_role_invalid/);
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

test("effective-role guard rejects effective sequence privileges in application schemas", async () => {
  const db = await fixture(false);
  try {
    await db.exec(migration);
    await db.exec("CREATE SEQUENCE public.unrelated_application_seq");
    await db.exec("GRANT USAGE, SELECT ON SEQUENCE public.unrelated_application_seq TO khora_lector");
    await db.exec("SET ROLE khora_readonly_test");
    await assert.rejects(assertCustodiaReadOnlyRole(db as any), /custodia_readonly_role_invalid/);
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

test("effective-role guard rejects inherited PUBLIC access to archive payload", async () => {
  const db = await fixture(false);
  try {
    await db.exec(migration);
    await db.exec("GRANT SELECT (payload) ON public.volcado TO PUBLIC");
    await db.exec("SET ROLE khora_readonly_test");
    await assert.rejects(assertCustodiaReadOnlyRole(db as any), /custodia_readonly_role_invalid/);
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

test("runtime migration loader includes Custodia read schema", () => {
  assert.match(loader, /034_custodia_mcp_read_contract\.sql/);
});

test("Custodia read migration stays additive and contains no table or row deletion", () => {
  assert.match(migration, /Additive and idempotent/);
  assert.doesNotMatch(migration, /\b(DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE)\b/i);
  assert.match(migration, /GRANT SELECT \([\s\S]*?\) ON TABLE public\.dictado_session TO khora_lector/);
  assert.match(migration, /GRANT SELECT \(id, folio, usuario, session_id\)\s+ON TABLE public\.volcado TO khora_lector/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.dictado_session/);
  assert.match(migration, /REVOKE ALL \(%I\) ON TABLE public\.%I FROM khora_lector/);
});
