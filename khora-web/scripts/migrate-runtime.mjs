import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatorio para aplicar la migración de runtime.");
}

const migrationFiles = ["023_runtime_state.sql", "024_oauth_scopes.sql", "025_normative_receipts.sql", "026_normative_turns.sql", "027_manual_mcp_tokens.sql", "028_normative_order_ledger.sql", "029_github_credentials.sql", "032_graph_twins.sql"];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

try {
  for (const file of migrationFiles) {
    const sql = await fs.readFile(path.join(process.cwd(), "db/migrations", file), "utf8");
    await pool.query(sql);
  }
  console.log("Migraciones 023-029 de runtime, OAuth, evidencia normativa, Bearer manual y ledger de orden aplicadas.");
} catch (error) {
  console.error("Error aplicando migraciones de runtime:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
