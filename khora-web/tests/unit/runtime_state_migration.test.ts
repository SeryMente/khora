import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("023_runtime_state define almacenamiento idempotente del snapshot vivo", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/023_runtime_state.sql");
  assert.equal(fs.existsSync(migrationPath), true);
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.match(content, /BEGIN;/);
  assert.match(content, /CREATE TABLE IF NOT EXISTS khora_runtime_state/);
  assert.match(content, /runtime_id TEXT PRIMARY KEY/);
  assert.match(content, /observed_at TIMESTAMPTZ NOT NULL/);
  assert.match(content, /state JSONB NOT NULL/);
  assert.match(content, /CREATE INDEX IF NOT EXISTS khora_runtime_state_updated_idx/);
  assert.match(content, /COMMIT;/);
});
