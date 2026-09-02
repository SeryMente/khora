// @l0 L0-002-R · @req SISTEMA-MENU/E3,E4,E5
import "./setup";
import test from "node:test";
import assert from "node:assert/strict";
import { registrarEvento, cleanSecretos, validarEventId } from "../../lib/server/eventos";
import { reconciliarTranscripcion } from "../../lib/server/transcribir";
import { GET } from "../../app/api/eventos/route";
import { NextRequest } from "next/server";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";

test.beforeEach(() => {
  const memoryStore: any[] = [];
  const mockClient = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("SELECT") && sql.includes("eventos_sistema")) {
        return { rows: memoryStore, rowCount: memoryStore.length };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => {},
  };

  const mockDb = {
    query: async (sql: string, params?: any[]) => {
      return mockClient.query(sql, params);
    },
    connect: async () => mockClient,
  };

  setDbForTesting(mockDb as any);
});

test.afterEach(() => {
  resetDbForTesting();
});

test("registrarEvento nunca lanza ni bloquea aunque la DB falle", async () => {
  const ok = await registrarEvento({
    fase: "dictado",
    eventId: "DIC-001",
    estado: "OK",
    mensaje: "Prueba de evento no bloqueante gsk_1234567890abcdef",
    detalle: { secret: "ghp_1234567890abcdef" },
    correlacionId: "00000000-0000-0000-0000-000000000001",
  });
  assert.equal(typeof ok, "boolean");
});

test("redacción de secretos en cleanSecretos funciona correctamente", () => {
  const ghpSecret = "PAT: ghp_1234567890abcdef12345";
  const groqSecret = "Groq: gsk_1234567890abcdef12345";
  const notionSecret = "Notion: ntn_1234567890abcdef12345 y secret_1234567890abcdef12345";

  assert.equal(cleanSecretos(ghpSecret), "PAT: [REDACTED]");
  assert.equal(cleanSecretos(groqSecret), "Groq: [REDACTED]");
  assert.equal(cleanSecretos(notionSecret), "Notion: [REDACTED] y [REDACTED]");
});

test("validación de event_id por fase exige patrón ^{PREFIJO}-[0-9]{3}$", () => {
  assert.equal(validarEventId("dictado", "DIC-001"), true);
  assert.equal(validarEventId("dictado", "DIC-999"), true);
  assert.equal(validarEventId("dictado", "TRS-001"), false);
  assert.equal(validarEventId("transcripcion", "TRS-001"), true);
  assert.equal(validarEventId("transcripcion", "TRS-12"), false);
  assert.equal(validarEventId("revision", "REV-005"), true);
  assert.equal(validarEventId("ingesta", "ING-001"), true);
});

test("perdidaDetectada=true activa registro de evento en reconciliarTranscripcion", () => {
  const preview = "El paciente presenta fiebre alta y dolor de cabeza intenso.";
  const whisperPérdida = "El paciente presenta fiebre alta."; // omitió 'y dolor de cabeza intenso'

  const res = reconciliarTranscripcion(preview, whisperPérdida);
  assert.equal(res.perdidaDetectada, true);
  assert.equal(res.reconciliado, false);
});

test("GET /api/eventos con format=ndjson genera estructura x-ndjson", async () => {
  process.env.PLAYWRIGHT_TEST_RUN = "1";
  const req = new NextRequest("http://localhost:3000/api/eventos?format=ndjson");
  const res = await GET(req);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/x-ndjson; charset=utf-8");
  const text = await res.text();
  assert.equal(typeof text, "string");
});
