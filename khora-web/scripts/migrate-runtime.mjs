import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatorio para aplicar la migración de runtime.");
}

const migrationFiles = ["023_runtime_state.sql", "024_oauth_scopes.sql"];
const sql = (await Promise.all(migrationFiles.map((file) => fs.readFile(path.join(process.cwd(), "db/migrations", file), "utf8")))).join("\n");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

try {
  await pool.query("BEGIN");
  await pool.query(sql);
  await pool.query("COMMIT");
  console.log("Migraciones 023 runtime + 024 OAuth scopes aplicadas.");
} catch (error) {
  try {
    await pool.query("ROLLBACK");
  } catch {}
  console.error("Error aplicando migración 023 de runtime:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
