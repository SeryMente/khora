import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(process.cwd(), "db/migrations/034_notes.sql");
const runnerPath = path.resolve(process.cwd(), "scripts/migrate-notes.mjs");

test("034_notes is an additive, transactional migration isolated to khora_notes", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.khora_notes/);
  assert.match(sql, /user_id TEXT NOT NULL/);
  assert.match(sql, /checklist_items JSONB NOT NULL/);
  assert.match(sql, /tags TEXT\[\] NOT NULL/);
  assert.match(sql, /context_type TEXT/);
  assert.match(sql, /context_id TEXT/);
  assert.match(sql, /context_url TEXT/);
  assert.match(sql, /trashed_at TIMESTAMPTZ/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS khora_notes_user_status_pin_updated_idx/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS khora_notes_tags_gin_idx/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.khora_notes FROM PUBLIC/);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE FROM|ALTER TABLE)\b/i);
  assert.doesNotMatch(sql, /\b(volcado|dictado|custodia|ep_sessions)\b/i);
  assert.doesNotMatch(sql, /\b(ALTER|DROP|TRUNCATE|DELETE)\b/i);
});

test("dedicated 034 runner is remote-target guarded and transactional", () => {
  const runner = fs.readFileSync(runnerPath, "utf8");
  assert.match(runner, /KHORA_ALLOW_NOTES_MIGRATION/);
  assert.match(runner, /BEGIN/);
  assert.match(runner, /COMMIT/);
  assert.match(runner, /ROLLBACK/);
  assert.match(runner, /pg_advisory_xact_lock/);
  assert.doesNotMatch(runner, /migrate-runtime/);
});