import { Pool } from 'pg';

let pool: Pool | undefined;

export function getDb(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no está configurada.");
    }

    const isTest = process.env.DATABASE_URL.includes("localhost");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Usar SSL para la BD real de Neon, pero no para local.
      ssl: isTest ? false : {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}
