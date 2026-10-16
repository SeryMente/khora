import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_OUTPUT_FORMAT_VERSION } from "../../lib/server/normative-runtime";
import { describeMcpTool, MCP_TOOL_SCOPES, type McpToolName } from "../../lib/server/mcp-tool-contract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeTools = ["khora_observacion_instantanea", "khora_eventos_desde", "khora_estado_vivo", "khora_eventos_recientes"] as const;
const dataTools = ["khora_resumen", "khora_listar_volcados", "khora_leer_volcado", "khora_buscar_volcados", "khora_versiones_volcado", "khora_ui_review"] as const;
const normTools = ["khora_norm_open_turn", "khora_norm_apply_principle", "khora_norm_verify_turn", "khora_norm_release_turn"] as const;

test("MCP preserves root securitySchemes for all fifteen tools", () => {
  assert.equal(Object.keys(MCP_TOOL_SCOPES).length, 15);
  for (const [names, scopes] of [[runtimeTools, ["runtime:read"]], [dataTools, ["volcados:read"]], [normTools, ["norm:turn"]]] as const) {
    for (const name of names) {
      assert.deepEqual(describeMcpTool(name as McpToolName, "test", {}).securitySchemes, [{ type: "oauth2", scopes: [...scopes] }]);
    }
  }
  assert.deepEqual(describeMcpTool("khora_mcp_health", "health", {}).securitySchemes[0].scopes, ["volcados:read", "runtime:read", "norm:turn"]);
});

test("route publishes derived schemas and retains authentication and normative gate", () => {
  const route = fs.readFileSync(path.join(root, "app/api/mcp/route.ts"), "utf8");
  assert.match(route, /setRequestHandler\(ListToolsRequestSchema/);
  assert.match(route, /toolsList\.push\(describeMcpTool\(name, description, inputSchema\)\)/);
  assert.match(route, /toolsList\.push\(describeMcpTool\(name, description, effectiveSchema\)\)/);
  assert.match(route, /const effectiveSchema = withNormTurn\(inputSchema\)/);
  assert.match(route, /observedHandler\(args, true\)/);
  assert.match(route, /mcp\/www_authenticate/);
  assert.match(route, /error="insufficient_scope"/);
  assert.match(route, /await assertNormativeTurnOpen/);
  assert.match(route, /tokenGeneration !== currentGen/);
  assert.doesNotMatch(route, /const toolsList = \[/);
});

test("one canonical document covers the exact tool catalog and current output version", () => {
  const document = fs.readFileSync(path.join(root, "docs/normative-check.md"), "utf8");
  const readme = fs.readFileSync(path.join(root, "../README.md"), "utf8");
  const documented = [...document.matchAll(/^\| `(khora_[a-z_]+)`/gm)].map(match => match[1]);
  assert.equal(documented.length, 15);
  assert.deepEqual(documented.sort(), Object.keys(MCP_TOOL_SCOPES).sort());
  for (const heading of ["Conexión", "Catálogo", "Contratos", "Ciclo normativo", "Autorización y configuración", "Datos y efectos", "Diagnóstico", "Compatibilidad", "Pruebas y mantenimiento"]) {
    assert.equal(document.split("\n## " + heading + "\n").length, 2, heading);
  }
  assert.ok(document.includes("**" + REQUIRED_OUTPUT_FORMAT_VERSION + "**"));
  assert.equal(readme.split("(./khora-web/docs/normative-check.md)").length, 2);
  assert.match(document, /^# Servidor MCP de Khora — documento canónico/m);
});
