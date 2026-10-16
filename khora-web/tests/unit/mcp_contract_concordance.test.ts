import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";
import { describeMcpTool, MCP_TOOL_SCOPES, type McpToolName } from "../../lib/server/mcp-tool-contract";
import { isNormativeReceipt, normativeReceiptSchema } from "../../lib/server/normative-receipt-schema";
import { REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM, REASONING_MODES } from "../../lib/server/normative-runtime";
import { verifyNormativeReceipt } from "../../lib/server/norm-check";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const controls = {
  _norm_turn_token: "test-token-not-a-real-credential",
  _thinking_mode: "UNKNOWN",
  _output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
};
function receipt() {
  return {
    protocol: "NORM-CHECK", protocol_version: "v0.5.0",
    cycle: { id: "contract-test/T1", attempt: 1 },
    si: { version: "fixture", git_commit_sha: "a".repeat(40), git_blob_sha: "b".repeat(40), sha256: "c".repeat(64), manifest_sha256: "d".repeat(64) },
    methodology: { version: "fixture", git_commit_sha: "e".repeat(40), git_blob_sha: "f".repeat(40), sha256: "a".repeat(64) },
    input_sha256: "b".repeat(64), nonce: "nonce-contract-fixture-0123456789",
    principles: [{ folio: "P001", status: "A", anchor: "ContractTest" }],
    output: "Structural fixture, not a verified cycle", output_sha256: "c".repeat(64),
    output_header: "S".repeat(32), methodology_output_header: "M".repeat(32),
    evidence_sha256: "d".repeat(64), created_at: "2026-10-16T18:03:31.233Z",
    runtime: { platform: REQUIRED_PLATFORM, reasoning_mode: "UNKNOWN", output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION },
  };
}

// Evaluate only the schema expressions in the real route; never handlers,
// imports, database calls or credentials. A timeout bounds fixture evaluation.
function routeContracts() {
  const source = fs.readFileSync(path.join(root, "app/api/mcp/route.ts"), "utf8");
  const ast = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true);
  const result: Array<{ name: McpToolName; description: string; shape: z.ZodRawShape }> = [];
  const ungated = new Set(["khora_mcp_health", "khora_norm_open_turn", "khora_norm_apply_principle", "khora_norm_verify_turn", "khora_norm_release_turn"]);
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "gatedTool" && ts.isStringLiteral(node.arguments[0])) {
      const name = node.arguments[0].text as McpToolName;
      const context = { z, normativeReceiptSchema, REASONING_MODES, REQUIRED_OUTPUT_FORMAT_VERSION,
        NORM_THINKING_MODE: z.enum(REASONING_MODES), NORM_OUTPUT_FORMAT_VERSION: z.literal(REQUIRED_OUTPUT_FORMAT_VERSION) };
      const shape = vm.runInNewContext(`(${node.arguments[2].getText(ast)})`, context, { timeout: 1000 });
      const description = vm.runInNewContext(`(${node.arguments[1].getText(ast)})`, {}, { timeout: 1000 });
      result.push({ name, description, shape: ungated.has(name) ? shape : {
        ...shape, _norm_turn_token: z.string().min(16), _thinking_mode: z.enum(REASONING_MODES), _output_format_version: z.literal(REQUIRED_OUTPUT_FORMAT_VERSION),
      } });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return result;
}
function input(name: McpToolName): Record<string, unknown> {
  if (name === "khora_mcp_health" || name === "khora_norm_open_turn") return { thinking_mode: "UNKNOWN", output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION };
  if (name === "khora_norm_apply_principle") return { turn_token: controls._norm_turn_token, folio: "P001", status: "A", anchor: "ContractTest" };
  if (name === "khora_norm_verify_turn") return { turn_token: controls._norm_turn_token, receipt: receipt() };
  if (name === "khora_norm_release_turn") return { turn_token: controls._norm_turn_token };
  const business = name === "khora_leer_volcado" ? { id: "1" } : name === "khora_buscar_volcados" ? { busqueda: "fixture" } : name === "khora_versiones_volcado" ? { volcado_id: "1" } : {};
  return { ...controls, ...business };
}

test("all 15 real registration shapes generate valid schemas and accept advertised examples", () => {
  const contracts = routeContracts();
  assert.equal(contracts.length, 15);
  assert.deepEqual(contracts.map(x => x.name).sort(), Object.keys(MCP_TOOL_SCOPES).sort());
  const validator = new AjvJsonSchemaValidator();
  for (const contract of contracts) {
    const published = describeMcpTool(contract.name, contract.description, contract.shape);
    const check = validator.getValidator(JSON.parse(JSON.stringify(published.inputSchema)));
    const example = input(contract.name);
    assert.equal(check(example).valid, true, contract.name);
    assert.equal(z.object(contract.shape).safeParse(example).success, true, contract.name);
    if ("_norm_turn_token" in example) {
      for (const field of Object.keys(controls)) {
        const invalid = { ...example }; delete invalid[field];
        assert.equal(check(invalid).valid, false, `${contract.name}/${field}`);
        assert.equal(z.object(contract.shape).safeParse(invalid).success, false);
      }
    }
  }
});

test("receipt schema publishes every required field and rejects their omission independently", () => {
  const schema = z.toJSONSchema(normativeReceiptSchema, { target: "draft-7", io: "input" });
  const check = new AjvJsonSchemaValidator().getValidator(JSON.parse(JSON.stringify(schema)));
  for (const field of Object.keys(receipt())) {
    const invalid: Record<string, unknown> = receipt(); delete invalid[field];
    assert.equal(check(invalid).valid, false, field);
    assert.equal(normativeReceiptSchema.safeParse(invalid).success, false, field);
    assert.equal(isNormativeReceipt(invalid), false, field);
  }
});

test("receipt preserves evidence extras and enforces conditional principle evidence", () => {
  const value = { ...receipt(), extra_evidence: { preserved: true } };
  assert.deepEqual(normativeReceiptSchema.parse(value), value);
  for (const entry of [
    { folio: "P001", status: "A" }, { folio: "P001", status: "C", anchor: "bad anchor" },
    { folio: "P001", status: "N" }, { folio: "P001", status: "N", reason_code: "lowercase" },
  ]) assert.equal(isNormativeReceipt({ ...value, principles: [entry] }), false);
  assert.equal(isNormativeReceipt({ ...value, principles: [{ folio: "P001", status: "N", reason_code: "NOT_APPLICABLE" }] }), true);
});

test("semantic date/whitespace checks and platform restriction remain fail closed", () => {
  for (const change of [{ created_at: "not-a-date" }, { output_header: " ".repeat(32) }, { cycle: { id: " ", attempt: 1 } }, { runtime: { ...receipt().runtime, platform: "Notion" } }]) {
    assert.equal(isNormativeReceipt({ ...receipt(), ...change }), false);
  }
  assert.equal(REQUIRED_PLATFORM, "ChatGPT");
});

test("malformed receipt is rejected by the real verifier before any network request", async () => {
  const original = globalThis.fetch; let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("Unexpected network"); };
  try {
    const value: Record<string, unknown> = receipt(); delete value.output;
    const result = await verifyNormativeReceipt(value);
    assert.equal(result.status, "INVALID");
    assert.deepEqual(result.reasons, ["RECEIPT_SCHEMA_INVALID"]);
    assert.equal(called, false);
  } finally { globalThis.fetch = original; }
});

test("SDK tools/list and tools/call agree for all route schemas in memory (no auth or database proof)", async () => {
  const server = new McpServer({ name: "khora-contract-fixture", version: "test" });
  const client = new Client({ name: "contract-test", version: "test" });
  const contracts = routeContracts(); let calls = 0;
  const tools = contracts.map(c => {
    server.tool(c.name, c.description, c.shape, async () => { calls++; return { content: [{ type: "text", text: "schema-only fixture" }] }; });
    return describeMcpTool(c.name, c.description, c.shape);
  });
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 15);
    for (const c of contracts) {
      const result = await client.callTool({ name: c.name, arguments: input(c.name) });
      assert.notEqual(result.isError, true, c.name);
    }
    assert.equal(calls, 15);
    const bad = input("khora_norm_verify_turn"); delete (bad.receipt as Record<string, unknown>).output;
    const rejected = await client.callTool({ name: "khora_norm_verify_turn", arguments: bad });
    assert.equal(rejected.isError, true);
    assert.equal(calls, 15, "invalid input must not reach handler");
  } finally { await client.close(); await server.close(); }
});
