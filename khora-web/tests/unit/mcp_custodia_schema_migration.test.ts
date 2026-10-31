import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(webRoot, "db/migrations/034_custodia_mcp_read_contract.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const loader = fs.readFileSync(path.join(webRoot, "scripts/migrate-runtime.mjs"), "utf8");

test("Custodia MCP read schema is an additive idempotent runtime migration", () => {
  assert.match(migration, /ALTER TABLE dictado_session[\s\S]*ADD COLUMN IF NOT EXISTS custodia_owner TEXT/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dictado_checkpoint/);
  assert.match(migration, /client_at BIGINT NOT NULL/);
  assert.match(migration, /snapshot TEXT NOT NULL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dictado_mp3/);
  for (const column of ["lease_id UUID", "source_manifest TEXT", "source_parts INTEGER", "captura_completa BOOLEAN", "siguiente_intento TIMESTAMPTZ"]) {
    assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS " + column), column);
  }
  for (const column of ["fuente_audio TEXT", "original_name TEXT", "mime_type TEXT", "start_ms INTEGER", "end_ms INTEGER", "duracion_ms INTEGER", "estado_verificacion TEXT"]) {
    assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS " + column), column);
  }
  assert.match(migration, /Additive and idempotent/);
  assert.doesNotMatch(migration, /\b(DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE)\b/i);
});

test("runtime migration loader includes Custodia read schema without applying it in this test", () => {
  assert.match(loader, /"034_custodia_mcp_read_contract\.sql"/);
});
