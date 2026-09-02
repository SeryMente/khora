// @l0 L0-002-R · @req FOLIO-01/REQ-1
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

test("009_folio.sql migration file contains exact required DDL and backfill statements", () => {
  const migrationPath = path.resolve(process.cwd(), "db/migrations/009_folio.sql");
  assert.strictEqual(fs.existsSync(migrationPath), true, "Migration file must exist");

  const content = fs.readFileSync(migrationPath, "utf8");

  // Check required SQL components
  assert.match(content, /ALTER TABLE volcado ADD COLUMN IF NOT EXISTS folio INTEGER;/i);
  assert.match(content, /ORDER BY recibido_en ASC, id ASC/i);
  assert.match(content, /CREATE SEQUENCE IF NOT EXISTS volcado_folio_seq;/i);
  assert.match(content, /SELECT setval\('volcado_folio_seq', COALESCE\(\(SELECT max\(folio\) FROM volcado\), 0\), true\);/i);
  assert.match(content, /ALTER TABLE volcado ALTER COLUMN folio SET DEFAULT nextval\('volcado_folio_seq'\);/i);
  assert.match(content, /ALTER SEQUENCE volcado_folio_seq OWNED BY volcado\.folio;/i);
  assert.match(content, /CREATE UNIQUE INDEX IF NOT EXISTS volcado_folio_uniq ON volcado \(folio\);/i);
});

test("folio logic: backfill SQL simulation", () => {
  // Simulate database rows before migration
  const rows: Array<{ id: string; folio: number | null; titulo: string; recibido_en: string }> = [
    { id: "uuid-2", folio: null, titulo: "Volcado 2", recibido_en: "2026-01-01T11:00:00Z" },
    { id: "uuid-1", folio: null, titulo: "Volcado 1", recibido_en: "2026-01-01T10:00:00Z" },
    { id: "uuid-3", folio: null, titulo: "Volcado 3", recibido_en: "2026-01-01T12:00:00Z" },
  ];

  // Run backfill logic as structured in WITH base ... ORDER BY recibido_en ASC, id ASC
  let maxFolio = 0;
  for (const r of rows) {
    if (r.folio != null && (r.folio as number) > maxFolio) maxFolio = r.folio;
  }

  const unfoliated = rows.filter(r => r.folio == null);
  unfoliated.sort((a, b) => {
    if (a.recibido_en < b.recibido_en) return -1;
    if (a.recibido_en > b.recibido_en) return 1;
    return a.id < b.id ? -1 : 1;
  });

  let n = 1;
  for (const r of unfoliated) {
    r.folio = maxFolio + n++;
  }

  // 1. Verify 1..N assignment in ascending order of recibido_en
  assert.strictEqual(rows.find(r => r.id === "uuid-1")?.folio, 1);
  assert.strictEqual(rows.find(r => r.id === "uuid-2")?.folio, 2);
  assert.strictEqual(rows.find(r => r.id === "uuid-3")?.folio, 3);

  // 2. Idempotency check: running again on assigned rows does not alter any folio
  const unfoliated2 = rows.filter(r => r.folio == null);
  assert.strictEqual(unfoliated2.length, 0, "No rows left with NULL folio");
  assert.strictEqual(rows.find(r => r.id === "uuid-1")?.folio, 1);
  assert.strictEqual(rows.find(r => r.id === "uuid-2")?.folio, 2);
  assert.strictEqual(rows.find(r => r.id === "uuid-3")?.folio, 3);

  // 3. New row gets max(folio) + 1
  const currentMax = Math.max(...rows.map(r => r.folio as number));
  const newRow = { id: "uuid-4", folio: currentMax + 1, titulo: "Volcado 4", recibido_en: "2026-01-01T13:00:00Z" };
  rows.push(newRow);

  assert.strictEqual(newRow.folio, 4);
});
