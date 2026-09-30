import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("024_oauth_scopes agrega scope a códigos y refresh tokens sin destruir defaults", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/024_oauth_scopes.sql");
  assert.equal(fs.existsSync(migrationPath), true);
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.match(content, /BEGIN;/);
  assert.match(content, /ALTER TABLE oauth_codes/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'volcados:read'/);
  assert.match(content, /ALTER TABLE oauth_refresh_tokens/);
  assert.match(content, /CREATE INDEX IF NOT EXISTS idx_oauth_codes_scope/);
  assert.match(content, /CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_scope/);
  assert.match(content, /COMMIT;/);
});
