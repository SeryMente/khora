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


test("migrate-runtime incluye 027_manual_mcp_tokens", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/migrate-runtime.mjs");
  const content = fs.readFileSync(scriptPath, "utf8");
  assert.match(content, /"027_manual_mcp_tokens\.sql"/);
});

test("028_normative_order_ledger define el ledger server-side y el binding de snapshot", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/028_normative_order_ledger.sql");
  assert.equal(fs.existsSync(migrationPath), true);
  const content = fs.readFileSync(migrationPath, "utf8");

  assert.match(content, /ADD COLUMN IF NOT EXISTS platform/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS reasoning_mode/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS output_format_version/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS si_git_commit_sha/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS application_index/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS application_vector JSONB/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS order_verified/);
  assert.match(content, /ADD COLUMN IF NOT EXISTS application_log_sha256/);
});

test("migrate-runtime incluye 028_normative_order_ledger", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/migrate-runtime.mjs");
  const content = fs.readFileSync(scriptPath, "utf8");
  assert.match(content, /"028_normative_order_ledger\.sql"/);
});

test("normative turn inserts keep SQL placeholder cardinality aligned", () => {
  const sourcePath = path.resolve(process.cwd(), "lib/server/mcp-normative.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const openInsert = source.match(/INSERT INTO normative_turns[\s\S]*?VALUES \(([^)]*)\)/)?.[1] ?? "";
  const receiptInsert = source.match(/INSERT INTO normative_receipts[\s\S]*?VALUES \(([^)]*)\)/)?.[1] ?? "";

  assert.equal((openInsert.match(/\$\d+/g) ?? []).length, 19);
  assert.equal((receiptInsert.match(/\$\d+/g) ?? []).length, 29);
});
