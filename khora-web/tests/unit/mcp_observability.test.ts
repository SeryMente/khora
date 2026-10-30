import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function observabilityFixture(
  query: (sql: string, params?: readonly unknown[]) => Promise<{ rows: any[]; rowCount?: number }>,
) {
  const exports: any = {};
  const source = fs.readFileSync(path.join(root, "lib/server/mcp-observability.ts"), "utf8");
  const modules: Record<string, any> = {
    "./mcp-db": { getMcpReadOnlyDb: () => ({ query }) },
  };
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;

  vm.runInNewContext(code, {
    exports,
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), name);
      return modules[name];
    },
  });
  return exports;
}

test("recent-event filters match the persisted flat envelope and retain legacy nested compatibility", async () => {
  let captured: { sql: string; params: readonly unknown[] } | null = null;
  const tools = observabilityFixture(async (sql, params = []) => {
    captured = { sql: String(sql), params };
    return { rows: [{ id: 7, event_uuid: "event-7" }] };
  });

  const result = await tools.toolKhoraEventosRecientes({
    segundos: 300,
    limite: 20,
    session_id: "session-target",
    component: "ingreso_workspace",
    severity: "WARN",
    outcome: "PARTIAL",
    fase: "dictado",
    scope: "dictado",
    category: "recognition",
  });

  assert.equal(result.retornados, 1);
  assert.ok(captured);
  const sql = captured!.sql;
  assert.match(sql, /COALESCE\(detalle->>'severity', detalle->'observation'->>'severity'\) = \$4/);
  assert.match(sql, /COALESCE\(detalle->>'scope', detalle->'observation'->>'scope'\) = \$7/);
  assert.match(sql, /COALESCE\(detalle->>'category', detalle->'observation'->>'category'\) = \$8/);
  assert.equal(
    JSON.stringify(captured!.params),
    JSON.stringify([300, "session-target", "ingreso_workspace", "WARN", "PARTIAL", "dictado", "dictado", "recognition", 20]),
  );
});

test("session-scoped snapshot applies the same session filter to active sessions and severity aggregates", async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  const now = new Date().toISOString();
  const tools = observabilityFixture(async (sql, params = []) => {
    const statement = String(sql);
    calls.push({ sql: statement, params });

    if (statement.includes("COALESCE(MAX(id)")) return { rows: [{ cursor: "15" }] };
    if (statement.includes("count(*)")) {
      return { rows: [{
        total: 3, failures: 1, warnings: 1, sessions: 1,
        last_server_event_at: now, last_client_event_at: now,
      }] };
    }
    if (statement.includes("WHERE updated_at >= NOW() - INTERVAL '15 minutes'")) {
      return { rows: [{ runtime_id: "runtime-target", session_id: "session-target" }] };
    }
    if (statement.includes("FROM khora_runtime_state")) {
      return { rows: [{ runtime_id: "runtime-target", session_id: "session-target", updated_at: now }] };
    }
    if (statement.includes("INTERVAL '60 minutes'")) return { rows: [{ id: 11, session_id: "session-target" }] };
    if (statement.includes("FROM eventos_sistema")) return { rows: [{ id: 10, session_id: "session-target", servidor_en: now }] };
    return { rows: [] };
  });

  const snapshot = await tools.toolKhoraObservacionInstantanea({ session_id: "session-target" });
  const activeSessionsQuery = calls.find((call) => call.sql.includes("WHERE updated_at >= NOW() - INTERVAL '15 minutes'"));
  assert.ok(activeSessionsQuery);
  assert.match(activeSessionsQuery!.sql, /AND session_id = \$1/);
  assert.equal(JSON.stringify(activeSessionsQuery!.params), JSON.stringify(["session-target"]));
  assert.equal(snapshot.sesiones_activas_observadas.length, 1);
  assert.equal(snapshot.sesiones_activas_observadas[0].session_id, "session-target");
  assert.equal(snapshot.actividad_ultimos_5_minutos.advertencias, 1);

  const activityQuery = calls.find((call) => call.sql.includes("count(*)"));
  const failuresQuery = calls.find((call) => call.sql.includes("INTERVAL '60 minutes'"));
  assert.ok(activityQuery);
  assert.ok(failuresQuery);
  assert.match(activityQuery!.sql, /COALESCE\(detalle->>'severity', detalle->'observation'->>'severity'\) = 'WARN'/);
  assert.match(failuresQuery!.sql, /COALESCE\(detalle->>'severity', detalle->'observation'->>'severity'\) IN \('ERROR','CRITICAL'\)/);
  assert.match(activeSessionsQuery!.sql, /AND session_id = \$1/);
});
