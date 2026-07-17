import { getDb } from "./neon";

export async function setupDb() {
  const pool = getDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      pin_hash VARCHAR(255) NOT NULL
    );
  `);
}
