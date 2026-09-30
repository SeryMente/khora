import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("MCP publica securitySchemes raiz para las diez herramientas", () => {
  const route = fs.readFileSync(path.join(root, "app", "api", "mcp", "route.ts"), "utf8");

  assert.match(route, /setRequestHandler\(ListToolsRequestSchema/);
  assert.match(route, /securitySchemes: \[\{ type: "oauth2", scopes: \["runtime:read"\] \}\]/);
  assert.match(route, /securitySchemes: \[\{ type: "oauth2", scopes: \["volcados:read"\] \}\]/);

  const runtimeTools = [
    "khora_observacion_instantanea",
    "khora_eventos_desde",
    "khora_estado_vivo",
    "khora_eventos_recientes",
  ];
  const dataTools = [
    "khora_resumen",
    "khora_listar_volcados",
    "khora_leer_volcado",
    "khora_buscar_volcados",
    "khora_versiones_volcado",
    "khora_ui_review",
  ];

  for (const name of runtimeTools) {
    const block = route.slice(route.indexOf(`name: "${name}"`), route.indexOf(`name: "${name}"`) + 1800);
    assert.match(block, /securitySchemes: \[\{ type: "oauth2", scopes: \["runtime:read"\] \}\]/, name);
  }

  for (const name of dataTools) {
    const block = route.slice(route.indexOf(`name: "${name}"`), route.indexOf(`name: "${name}"`) + 1800);
    assert.match(block, /securitySchemes: \[\{ type: "oauth2", scopes: \["volcados:read"\] \}\]/, name);
  }

  assert.match(route, /mcp\/www_authenticate/);
  assert.match(route, /error="insufficient_scope"/);
});
