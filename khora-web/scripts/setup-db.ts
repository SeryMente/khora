import { getDb } from "../lib/server/neon";
import bcrypt from "bcryptjs";

async function main() {
  const pool = getDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      pin_hash VARCHAR(255) NOT NULL
    );
  `);

  const res = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(res.rows[0].count) === 0) {
    const defaultPinHash = await bcrypt.hash("1234", 10);
    await pool.query('INSERT INTO users (pin_hash) VALUES ($1)', [defaultPinHash]);
    console.log("Created default user with PIN 1234");
  } else {
    console.log("Users table already populated");
  }

  process.exit(0);
}

main().catch(console.error);
