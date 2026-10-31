import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_OUTPUT_FORMAT_VERSION } from "../../lib/server/normative-runtime";
import { describeMcpTool, MCP_TOOL_SCOPES, type McpToolName } from "../../lib/server/mcp-tool-contract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeTools = ["khora_observacion_instantanea", "khora_eventos_desde", "khora_estado_vivo", "khora_eventos_recientes"] as const;
const dataTools = ["khora_resumen", "khora_listar_volcados", "khora_leer_volcado", "khora_buscar_volcados", "khora_versiones_volcado", "khora_ui_review", "khora_listar_audios", "khora_leer_audio"] as const;
const normTools = ["khora_norm_open_turn", "khora_norm_apply_principle", "khora_norm_verify_turn", "khora_norm_release_turn"] as const;
const julesReadTools = ["jules_list_sources", "jules_list_sessions", "jules_get_session", "jules_list_activities"] as const;
const julesWriteTools = ["jules_create_session", "jules_send_message", "jules_approve_plan"] as const;
const custodiaMetadataTools = ["khora_custodia_catalogo", "khora_custodia_revisiones"] as const;
const custodiaIntegrityTools = ["khora_custodia_verificar_integridad"] as const;

test("MCP preserves root securitySchemes for all twenty-seven tools", () => {
  assert.equal(Object.keys(MCP_TOOL_SCOPES).length, 27);
  for (const [names, scopes] of [
    [runtimeTools, ["runtime:read"]],
    [dataTools, ["volcados:read"]],
    [normTools, ["norm:turn"]],
    [julesReadTools, ["jules:read"]],
    [julesWriteTools, ["jules:write"]],
    [custodiaMetadataTools, ["custodia:metadata:read"]],
    [custodiaIntegrityTools, ["custodia:integrity:verify"]],
  ] as const) {
    for (const name of names) {
      assert.deepEqual(
        describeMcpTool(name as McpToolName, "test", {}).securitySchemes,
        [{ type: "oauth2", scopes: [...scopes] }],
      );
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
  assert.match(route, /requiredScopes\.every\(\(scope\) => scopes\.includes\(scope\)\)/);
  assert.match(route, /requiresNormativeTurn \|\| scopes\.includes\("norm:turn"\)/);
  assert.match(route, /tokenGeneration !== currentGen/);
  assert.match(route, /gatedTool\("khora_custodia_catalogo"/);
  assert.match(route, /gatedTool\("khora_custodia_revisiones"/);
  assert.match(route, /gatedTool\("khora_custodia_verificar_integridad"/);
  assert.match(route, /requireScope\("custodia:metadata:read"\)/);
  assert.match(route, /requireScope\("custodia:integrity:verify"\)/);
  assert.doesNotMatch(route, /const toolsList = \[/);
});

test("one canonical document covers exact tool catalog and current output version", () => {
  const document = fs.readFileSync(path.join(root, "docs/normative-check.md"), "utf8");
  const normalizedDocument = document.replace(/\r\n?/g, "\n");
  const readme = fs.readFileSync(path.join(root, "../README.md"), "utf8");
  const documented = Object.keys(MCP_TOOL_SCOPES).filter(name => document.includes(name));
  assert.equal(documented.length, 27);
  for (const tool of [...custodiaMetadataTools, ...custodiaIntegrityTools]) assert.ok(document.includes(tool), tool);
  for (const heading of ["Conexión", "Catálogo", "Contratos", "Ciclo normativo", "Autorización y configuración", "Datos y efectos", "Diagnóstico", "Compatibilidad", "Pruebas y mantenimiento"]) {
    assert.equal(normalizedDocument.split("\n## " + heading + "\n").length, 2, heading);
  }
  assert.ok(document.includes("**" + REQUIRED_OUTPUT_FORMAT_VERSION + "**"));
  assert.equal(readme.split("(./khora-web/docs/normative-check.md)").length, 2);
  assert.match(normalizedDocument, /^# Servidor MCP de Khora — documento canónico\n/m);
});

test("OAuth, manual Bearer and UI expose both Custodia scopes without preselecting them", () => {
  const checks: Array<[string, string]> = [
    ["app/.well-known/oauth-authorization-server/route.ts", "custodia:metadata:read"],
    ["app/.well-known/oauth-authorization-server/route.ts", "custodia:integrity:verify"],
    ["app/oauth/authorize/page.tsx", "custodia:metadata:read"],
    ["app/oauth/authorize/page.tsx", "custodia:integrity:verify"],
    ["app/api/oauth/token/route.ts", "custodia:metadata:read"],
    ["app/api/oauth/token/route.ts", "custodia:integrity:verify"],
    ["lib/server/mcp-config.ts", "custodia:metadata:read"],
    ["lib/server/mcp-config.ts", "custodia:integrity:verify"],
    ["lib/server/mcp-manual-token.ts", "custodia:metadata:read"],
    ["lib/server/mcp-manual-token.ts", "custodia:integrity:verify"],
    ["app/sistema/mcp/page.tsx", "custodia:metadata:read"],
    ["app/sistema/mcp/page.tsx", "custodia:integrity:verify"],
  ];
  for (const [relative, scope] of checks) {
    const fileContent = fs.readFileSync(path.join(root, relative), "utf8");
    assert.ok(fileContent.includes(scope), relative + " must support " + scope);
  }
  const page = fs.readFileSync(path.join(root, "app/sistema/mcp/page.tsx"), "utf8");
  const defaults = page.match(/const DEFAULT_SCOPES = \[(.*?)\] as const;/)?.[1] ?? "";
  assert.doesNotMatch(defaults, /custodia:/, "Custodia scopes must not be preselected");
  assert.match(page, /const SUPPORTED_SCOPES = .*custodia:metadata:read.*custodia:integrity:verify/);
});

test("Custodia access scopes remain distinct from ordinary read and normative-turn dependency", () => {
  assert.deepEqual(MCP_TOOL_SCOPES.khora_custodia_catalogo, ["custodia:metadata:read"]);
  assert.deepEqual(MCP_TOOL_SCOPES.khora_custodia_revisiones, ["custodia:metadata:read"]);
  assert.deepEqual(MCP_TOOL_SCOPES.khora_custodia_verificar_integridad, ["custodia:integrity:verify"]);
  const route = fs.readFileSync(path.join(root, "app/api/mcp/route.ts"), "utf8");
  assert.match(route, /const effectiveSchema = withNormTurn\(inputSchema\)/);
  assert.match(route, /requiresNormativeTurn \|\| scopes\.includes\("norm:turn"\)/);
});
