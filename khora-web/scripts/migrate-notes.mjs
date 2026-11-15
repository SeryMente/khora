import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL es obligatorio para aplicar la migración 034 de Notas.");
}

const target = new URL(connectionString);
const hostname = target.hostname.toLowerCase();
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(hostname);

if (!isLocal && process.env.KHORA_ALLOW_NOTES_MIGRATION !== "1") {
  throw new Error("La migración apunta a una base remota. Para ejecutarla se requiere KHORA_ALLOW_NOTES_MIGRATION=1.");
}

const migrationPath = path.join(process.cwd(), "db/migrations/034_notes.sql");
const sql = await fs.readFile(migrationPath, "utf8");
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});

const client = await pool.connect();
try {
  const targetInfo = await client.query(
    "SELECT current_database() AS database_name, current_user AS role_name, to_regclass('public.khora_notes') IS NOT NULL AS table_preexists",
  );
  const before = targetInfo.rows[0];

  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('khora:migration:034_notes'))");
    await client.query(sql);
    const verification = await client.query(
      `SELECT
         to_regclass('public.khora_notes') IS NOT NULL AS table_exists,
         (SELECT count(*)::int FROM information_schema.columns
          WHERE table_schema='public' AND table_name='khora_notes') AS column_count,
         (SELECT count(*)::int FROM pg_indexes
          WHERE schemaname='public' AND tablename='khora_notes') AS index_count`,
    );
    const after = verification.rows[0];
    if (!after.table_exists || Number(after.column_count) !== 15 || Number(after.index_count) < 3) {
      throw new Error("La verificación de la estructura de khora_notes fue incompleta.");
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({
      status: "APPLIED_AND_VERIFIED",
      migration: "034_notes.sql",
      database: before.database_name,
      role: before.role_name,
      targetHost: hostname,
      tablePreexisted: before.table_preexists,
      tableExists: after.table_exists,
      columns: Number(after.column_count),
      indexes: Number(after.index_count),
      existingProductionRowsModified: false,
      existingProductionRowsDeleted: false,
    }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
} finally {
  client.release();
  await pool.end();
}
