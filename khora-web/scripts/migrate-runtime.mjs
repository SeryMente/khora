import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatorio para aplicar la migración de runtime.");
}

const migrationFiles = ["016_ep_persistent_sessions.sql", "017_ep_master_auth_attempts.sql", "018_ep_github_install_token_requests.sql", "023_runtime_state.sql", "024_oauth_scopes.sql", "025_normative_receipts.sql", "026_normative_turns.sql", "027_manual_mcp_tokens.sql", "028_normative_order_ledger.sql"];

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
  console.log("Migraciones EP 016-018 y runtime 023-028 aplicadas.");
} catch (error) {
  console.error("Error aplicando migraciones de runtime:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
