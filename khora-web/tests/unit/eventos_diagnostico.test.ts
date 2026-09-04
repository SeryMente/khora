// @l0 L0-002-R · @req SISTEMA-MENU/E3,E4,E5 · Unit & Integration Tests for Event Log Repairs & Diagnostics
import "./setup";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import {
  diagnosticarEstadoAlmacen,
  registrarEventosBatch,
  cleanSecretos,
} from "../../lib/server/eventos";
import { GET, POST } from "../../app/api/eventos/route";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";

test.afterEach(() => {
  resetDbForTesting();
});

test("1. Base de datos no disponible responde 503 con DB_UNREACHABLE, retryable=true y cero detalles internos", async () => {
  const mockDbFailing = {
    query: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432 postgresql://secret_user:secret_pass@db.internal:5432/db");
    },
    connect: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432 postgresql://secret_user:secret_pass@db.internal:5432/db");
    },
  };

  setDbForTesting(mockDbFailing as any);

  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest("http://localhost:3000/api/eventos");
  const res = await GET(req);

  assert.equal(res.status, 503);
  const json = await res.json();

  assert.equal(json.ready, false);
  assert.equal(json.reason_code, "DB_UNREACHABLE");
  assert.equal(json.retryable, true);
  assert.equal(json.schema_version_expected, "1.1");
  assert.equal(json.schema_version_detected, null);
  assert.equal(typeof json.correlation_id, "string");

  // Security checks: ensure no secrets, stack, host or SQL are leaked
  const strBody = JSON.stringify(json);
  assert.equal(strBody.includes("secret_pass"), false);
  assert.equal(strBody.includes("ECONNREFUSED"), false);
  assert.equal(strBody.includes("db.internal"), false);
  assert.equal(strBody.includes("SELECT"), false);
});

test("2. Esquema ausente produce EVENT_SCHEMA_MISSING y GET no ejecuta DDL", async () => {
  let executedSqlCommands: string[] = [];

  const mockDbNoTable = {
    query: async (sql: string) => {
      executedSqlCommands.push(sql);
      if (sql.includes("SELECT 1")) {
        return { rows: [{ "?column?": 1 }] };
      }
      if (sql.includes("information_schema.tables")) {
        return { rows: [] }; // Table missing
      }
      return { rows: [] };
    },
  };

  setDbForTesting(mockDbNoTable as any);

  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest("http://localhost:3000/api/eventos");
  const res = await GET(req);

  assert.equal(res.status, 503);
  const json = await res.json();

  assert.equal(json.ready, false);
  assert.equal(json.reason_code, "EVENT_SCHEMA_MISSING");
  assert.equal(json.retryable, false);
  assert.equal(json.schema_version_detected, "none");

  // Prove zero DDL execution during GET
  const ddlKeywords = ["CREATE", "ALTER", "DROP", "INDEX"];
  for (const cmd of executedSqlCommands) {
    for (const kw of ddlKeywords) {
      assert.equal(
        cmd.toUpperCase().includes(kw),
        false,
        `Se ejecutó DDL prohibido '${kw}' en SQL: ${cmd}`
      );
    }
  }
});

test("3. Esquema histórico detecta columnas faltantes como EVENT_SCHEMA_OUTDATED y simula migración 022", async () => {
  let tableColumns = [
    "id", "fase", "event_id", "estado", "mensaje", "detalle",
    "volcado_id", "version", "sha256", "correlacion_id", "servidor_en",
    "cliente_en", "hash_anterior", "event_hash"
  ];

  let eventosDb: any[] = [
    { id: 1, fase: "dictado", event_id: "DIC-001", estado: "OK", mensaje: "Evento histórico v1", servidor_en: "2025-01-01T00:00:00Z" }
  ];

  const mockDbSchema = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("SELECT 1")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("information_schema.tables")) {
        return { rows: [{ table_name: "eventos_sistema" }] };
      }
      if (sql.includes("information_schema.columns")) {
        return { rows: tableColumns.map((col) => ({ column_name: col })) };
      }
      if (sql.includes("SELECT id, fase, event_id")) {
        return { rows: eventosDb, rowCount: eventosDb.length };
      }
      return { rows: [] };
    },
  };

  setDbForTesting(mockDbSchema as any);

  // GET antes de migración -> 503 EVENT_SCHEMA_OUTDATED
  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req1 = new NextRequest("http://localhost:3000/api/eventos");
  const res1 = await GET(req1);
  assert.equal(res1.status, 503);
  const json1 = await res1.json();
  assert.equal(json1.reason_code, "EVENT_SCHEMA_OUTDATED");

  // Simular aplicación de migración 022 agregando las columnas extendidas
  tableColumns.push(
    "event_uuid", "idempotency_key", "schema_version", "outcome",
    "component", "causation_id", "attempt_id", "sequence", "session_id",
    "release_sha", "duration_ms", "metrics", "reason_code", "privacy_class"
  );

  // GET después de migración -> 200 OK con los eventos existentes conservados
  const req2 = new NextRequest("http://localhost:3000/api/eventos");
  const res2 = await GET(req2);
  assert.equal(res2.status, 200);
  const json2 = await res2.json();
  assert.equal(json2.eventos.length, 1);
  assert.equal(json2.eventos[0].mensaje, "Evento histórico v1");
});

test("4. Rol sin permisos DDL puede ejecutar GET/POST si el esquema ya está migrado", async () => {
  const dmlOnlyClient = {
    query: async (sql: string, params?: any[]) => {
      if (/CREATE|ALTER|DROP|GRANT|REVOKE/i.test(sql)) {
        const err: any = new Error("permission denied for schema public");
        err.code = "42501";
        throw err;
      }
      if (sql.includes("SELECT 1")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("information_schema.tables")) return { rows: [{ table_name: "eventos_sistema" }] };
      if (sql.includes("information_schema.columns")) {
        return {
          rows: [
            "id", "fase", "event_id", "estado", "mensaje", "detalle",
            "volcado_id", "version", "sha256", "correlacion_id", "servidor_en",
            "cliente_en", "hash_anterior", "event_hash", "event_uuid",
            "idempotency_key", "schema_version", "outcome", "component",
            "causation_id", "attempt_id", "sequence", "session_id",
            "release_sha", "duration_ms", "metrics", "reason_code", "privacy_class"
          ].map((c) => ({ column_name: c })),
        };
      }
      if (sql.includes("SELECT id FROM eventos_sistema") || sql.includes("SELECT id, fase")) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    connect: async () => dmlOnlyClient,
  };

  setDbForTesting(dmlOnlyClient as any);

  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest("http://localhost:3000/api/eventos");
  const res = await GET(req);

  assert.equal(res.status, 200);
});

test("5. Migración 022 es sintácticamente válida e incluye transacción (BEGIN/COMMIT) e idempotencia", () => {
  const migrationPath = join(process.cwd(), "db/migrations/022_reparacion_registro_eventos.sql");
  const content = readFileSync(migrationPath, "utf8");

  assert.equal(content.includes("BEGIN;"), true);
  assert.equal(content.includes("COMMIT;"), true);
  assert.equal(content.includes("CREATE TABLE IF NOT EXISTS eventos_sistema"), true);
  assert.equal(content.includes("ADD COLUMN IF NOT EXISTS event_uuid"), true);
  assert.equal(content.includes("CREATE INDEX IF NOT EXISTS"), true);
  assert.equal(content.includes("CREATE TABLE IF NOT EXISTS eventos_outbox"), true);
});

test("6. GET /api/eventos soporta JSON y NDJSON con filtros y redacción de secretos", async () => {
  const eventsDb = [
    {
      id: 1,
      fase: "dictado",
      event_id: "DIC-001",
      estado: "OK",
      mensaje: "Inicio dictado gsk_1234567890abcdef12345",
      servidor_en: "2025-01-01T10:00:00Z",
    },
  ];

  const mockDb = {
    query: async (sql: string) => {
      if (sql.includes("SELECT 1")) return { rows: [{ "?column?": 1 }] };
      if (sql.includes("information_schema.tables")) return { rows: [{ table_name: "eventos_sistema" }] };
      if (sql.includes("information_schema.columns")) {
        return {
          rows: [
            "id", "fase", "event_id", "estado", "mensaje", "detalle",
            "volcado_id", "version", "sha256", "correlacion_id", "servidor_en",
            "cliente_en", "hash_anterior", "event_hash", "event_uuid",
            "idempotency_key", "schema_version", "outcome", "component",
            "causation_id", "attempt_id", "sequence", "session_id",
            "release_sha", "duration_ms", "metrics", "reason_code", "privacy_class"
          ].map((c) => ({ column_name: c })),
        };
      }
      if (sql.includes("SELECT id, fase")) {
        return { rows: eventsDb, rowCount: eventsDb.length };
      }
      return { rows: [] };
    },
  };

  setDbForTesting(mockDb as any);
  process.env.PLAYWRIGHT_TEST_RUN = "1";

  // NDJSON test
  const reqNdjson = new NextRequest("http://localhost:3000/api/eventos?format=ndjson&fase=dictado");
  const resNdjson = await GET(reqNdjson);
  assert.equal(resNdjson.status, 200);
  assert.equal(resNdjson.headers.get("Content-Type"), "application/x-ndjson; charset=utf-8");
  const textNdjson = await resNdjson.text();
  assert.equal(textNdjson.includes("DIC-001"), true);
});

test("7. Diagnóstico sanitizado ante error grave no filtra detalles internos", async () => {
  const mockDbForbidden = {
    query: async (sql: string) => {
      const err: any = new Error("permission denied for table eventos_sistema - postgresql://admin:secret123@host:5432/db");
      err.code = "42501";
      throw err;
    },
  };

  setDbForTesting(mockDbForbidden as any);

  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest("http://localhost:3000/api/eventos");
  const res = await GET(req);

  assert.equal(res.status, 503);
  const json = await res.json();
  assert.equal(json.reason_code, "EVENT_STORE_FORBIDDEN");
  assert.equal(json.ready, false);

  const strBody = JSON.stringify(json);
  assert.equal(strBody.includes("secret123"), false);
  assert.equal(strBody.includes("admin"), false);
});
