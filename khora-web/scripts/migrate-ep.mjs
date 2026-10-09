import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatorio");
const migrations = [
  "016_ep_persistent_sessions.sql",
  "017_ep_master_auth_attempts.sql",
  "018_ep_github_install_token_requests.sql",
];
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const file of migrations) {
      const sql = await fs.readFile(path.join(process.cwd(), "db/migrations", file), "utf8");
      await client.query(sql);
    }
    await client.query("COMMIT");
    console.log("Migraciones EP 016-018 aplicadas.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
} finally { await pool.end(); }
