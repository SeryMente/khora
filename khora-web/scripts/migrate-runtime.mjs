import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL es obligatorio para aplicar la migración de runtime.");
}

const sql = await fs.readFile(
  path.join(process.cwd(), "db/migrations/023_runtime_state.sql"),
  "utf8",
);

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
  console.log("Migración 023 de runtime aplicada.");
} catch (error) {
  try {
    await pool.query("ROLLBACK");
  } catch {}
  console.error("Error aplicando migración 023 de runtime:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
