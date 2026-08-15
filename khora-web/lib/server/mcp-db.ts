// @l0 L0-002 §4 · @req MCP-DB-01/REQ-1
import { Pool } from "pg";

let mcpPool: Pool | undefined;

export function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function getMcpReadOnlyDb(): Pool {
  if (!mcpPool) {
    const readonlyUrl = process.env.KHORA_READONLY_DATABASE_URL;

    if (!readonlyUrl) {
      if (isProductionEnv()) {
        throw new Error("KHORA_READONLY_DATABASE_URL mandatory in production for MCP");
      }
      console.warn(
        "ADVERTENCIA: KHORA_READONLY_DATABASE_URL no configurada fuera de producción. Usando fallback DATABASE_URL para lectura."
      );
    }

    const connectionString = readonlyUrl || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No hay URL de base de datos disponible para MCP.");
    }

    const isLocalhost = connectionString.includes("localhost");
    mcpPool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });
  }

  return mcpPool;
}
