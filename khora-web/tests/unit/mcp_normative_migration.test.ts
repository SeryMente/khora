import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("026_normative_turns define un ciclo normativo único y sus invariantes", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/026_normative_turns.sql");
  assert.equal(fs.existsSync(migrationPath), true);
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.match(content, /CREATE TABLE IF NOT EXISTS normative_turns/);
  assert.match(content, /cycle_id TEXT PRIMARY KEY/);
  assert.match(content, /current_attempt INTEGER NOT NULL CHECK \(current_attempt > 0\)/);
  assert.match(content, /status TEXT NOT NULL CHECK \(status IN \('OPEN','CLOSED'\)\)/);
  assert.match(content, /nonce TEXT NOT NULL UNIQUE/);
});


test("027_manual_mcp_tokens define un Bearer manual revocable, scoped and expirable", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/027_manual_mcp_tokens.sql");
  assert.equal(fs.existsSync(migrationPath), true);
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.match(content, /CREATE TABLE IF NOT EXISTS mcp_manual_tokens/);
  assert.match(content, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(content, /generacion INTEGER NOT NULL CHECK \(generacion > 0\)/);
  assert.match(content, /expira_en TIMESTAMPTZ NOT NULL/);
  assert.match(content, /revocado_en TIMESTAMPTZ/);
});
