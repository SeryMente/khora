import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { routeFixture } from "./helpers/mcp-route-fixture";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";
import { describeMcpTool, MCP_TOOL_SCOPES, type McpToolName } from "../../lib/server/mcp-tool-contract";
import { isNormativeReceipt, normativeReceiptSchema } from "../../lib/server/normative-receipt-schema";
import { REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM } from "../../lib/server/normative-runtime";
import { verifyNormativeReceipt } from "../../lib/server/norm-check";

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

// Discover through the real route/HTTP transport, not a reconstructed gate.
async function routeContracts() {
  const fixture = routeFixture();
  const client = new Client({ name: "contract-test", version: "test" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(fixture.url), {
      fetch: fixture.fetch, requestInit: { headers: { Authorization: "Bearer fixture-access" } },
    }));
    await client.listTools();
    return [...fixture.schemas].map(([name, contract]) => ({ name, ...contract }));
  } finally { await client.close(); await fixture.close(); }
}
function input(name: McpToolName): Record<string, unknown> {
  if (name === "khora_mcp_health" || name === "khora_norm_open_turn") return { thinking_mode: "UNKNOWN", output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION };
  if (name === "khora_norm_apply_principle") return { turn_token: controls._norm_turn_token, folio: "P001", status: "A", anchor: "ContractTest" };
  if (name === "khora_norm_verify_turn") return { turn_token: controls._norm_turn_token, receipt: receipt() };
  if (name === "khora_norm_release_turn") return { turn_token: controls._norm_turn_token };
  if (name === "khora_custodia_catalogo") return { ...controls, limite: 20 };
  if (name === "khora_custodia_revisiones") return { ...controls, session_id: "fixture-session", limite: 20 };
  if (name === "khora_custodia_verificar_integridad") return { ...controls, session_id: "fixture-session", limite: 20 };
  const business = (name === "khora_leer_volcado" || name === "khora_leer_audio") ? { id: "1" } : name === "khora_buscar_volcados" ? { busqueda: "fixture" } : name === "khora_versiones_volcado" ? { volcado_id: "1" } : {};
  return { ...controls, ...business };
}

test("all 20 real registration shapes generate valid schemas and accept advertised examples", async () => {
  const contracts = await routeContracts();
  assert.equal(contracts.length, 20);
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
  function paths(value: Record<string, unknown>, prefix: string[] = []): string[][] {
    return Object.entries(value).flatMap(([key, child]) => {
      const p = [...prefix, key];
      return [p, ...(child && typeof child === "object" && !Array.isArray(child) ? paths(child as Record<string, unknown>, p) : [])];
    });
  }
  for (const path of paths(receipt())) {
    const invalid = structuredClone(receipt()) as Record<string, unknown>;
    let parent = invalid;
    for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
    delete parent[path.at(-1)!];
    assert.equal(check(invalid).valid, false, path.join("."));
    assert.equal(normativeReceiptSchema.safeParse(invalid).success, false, path.join("."));
    assert.equal(isNormativeReceipt(invalid), false, path.join("."));
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

async function connect(fixture: ReturnType<typeof routeFixture>) {
  const client = new Client({ name: "contract-test", version: "test" });
  await client.connect(new StreamableHTTPClientTransport(new URL(fixture.url), {
    fetch: fixture.fetch, requestInit: { headers: { Authorization: "Bearer fixture-access" } },
  }));
  return client;
}

test("real route: HTTP discovery and all 20 calls agree; malformed input cannot reach service", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 20);
    assert.deepEqual(listed.tools.map(x => x.name).sort(), Object.keys(MCP_TOOL_SCOPES).sort());
    for (const tool of listed.tools) {
      const contract = fixture.schemas.get(tool.name as McpToolName)!;
      assert.deepEqual(tool.inputSchema, JSON.parse(JSON.stringify(describeMcpTool(tool.name as McpToolName, contract.description, contract.shape).inputSchema)));
      assert.notEqual((await client.callTool({ name: tool.name, arguments: input(tool.name as McpToolName) })).isError, true, tool.name);
    }
    assert.equal(fixture.calls.length, 19, "health reads its snapshot separately");
    for (const call of fixture.calls.filter(x => !x.name.endsWith("NormativeTurn") && x.name !== "applyNormativePrinciple")) {
      for (const field of Object.keys(controls)) assert.equal(Object.hasOwn(call.args ?? {}, field), false, call.name);
    }
    const bad = input("khora_norm_verify_turn"); delete (bad.receipt as Record<string, unknown>).output;
    assert.equal((await client.callTool({ name: "khora_norm_verify_turn", arguments: bad })).isError, true);
    assert.equal(fixture.calls.length, 16);
  } finally { await client.close(); await fixture.close(); }
});

test("real route: missing/revoked auth and missing configuration fail before services", async () => {
  for (const [options, authorization, status] of [
    [{}, "", 401], [{}, "Bearer invalid-fixture", 401],
    [{ revoked: true }, "Bearer fixture-access", 401],
    [{ scopes: [] }, "Bearer fixture-access", 401],
    [{ configured: false }, "Bearer fixture-access", 503],
    [{ production: true }, "Bearer fixture-access", 503],
  ] as const) {
    const fixture = routeFixture(options as Parameters<typeof routeFixture>[0]);
    try {
      const response = await fixture.fetch(fixture.url, { headers: { Authorization: authorization } });
      assert.equal(response.status, status);
      if (status === 401) assert.match(response.headers.get("www-authenticate") ?? "", /resource_metadata=/);
      assert.equal(fixture.calls.length, 0);
    } finally { await fixture.close(); }
  }
});

test("real route: every substantive tool is blocked by scope or denied turn; norm opening requires scope", async () => {
  const substantive = Object.keys(MCP_TOOL_SCOPES).filter(n => n !== "khora_mcp_health" && !n.startsWith("khora_norm_")) as McpToolName[];
  for (const options of [{ scopes: ["norm:turn"] }, { denyTurn: true }]) {
    const fixture = routeFixture(options); const client = await connect(fixture);
    try {
      for (const name of substantive) {
        const denied = await client.callTool({ name, arguments: input(name) });
        assert.equal(denied.isError, true, name);
        assert.match(JSON.stringify(denied), options.denyTurn ? /NORMATIVE_TURN_REQUIRED/ : /insufficient_scope/);
      }
      assert.equal(fixture.calls.length, 0);
    } finally { await client.close(); await fixture.close(); }
  }
  const fixture = routeFixture({ scopes: ["runtime:read"] }); const client = await connect(fixture);
  try {
    assert.equal((await client.callTool({ name: "khora_norm_open_turn", arguments: input("khora_norm_open_turn") })).isError, true);
    assert.equal(fixture.calls.length, 0);
  } finally { await client.close(); await fixture.close(); }
});

test("real route: malformed controls and numeric bounds cannot reach business services", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    for (const patch of [{ _norm_turn_token: "short" }, { _thinking_mode: "invented" }, { _output_format_version: "v0" }]) {
      assert.equal((await client.callTool({ name: "khora_resumen", arguments: { ...input("khora_resumen"), ...patch } })).isError, true);
    }
    for (const patch of [{ cursor: -1 }, { cursor: 1.5 }, { limite: 0 }, { limite: 201 }]) {
      assert.equal((await client.callTool({ name: "khora_eventos_desde", arguments: { ...input("khora_eventos_desde"), ...patch } })).isError, true);
    }
    assert.equal(fixture.calls.length, 0);
  } finally { await client.close(); await fixture.close(); }
});

test("Custodia tools require their specialized scopes; volcados:read is not a substitute", async () => {
  const cases = [
    ["khora_custodia_catalogo", "custodia:metadata:read"],
    ["khora_custodia_revisiones", "custodia:metadata:read"],
    ["khora_custodia_verificar_integridad", "custodia:integrity:verify"],
  ] as const;
  for (const [name, specializedScope] of cases) {
    const deniedFixture = routeFixture({ scopes: ["volcados:read", "norm:turn"] });
    const deniedClient = await connect(deniedFixture);
    try {
      const denied = await deniedClient.callTool({ name, arguments: input(name) });
      assert.equal(denied.isError, true, name);
      assert.match(JSON.stringify(denied), /insufficient_scope/);
      assert.equal(deniedFixture.calls.length, 0, name);
    } finally { await deniedClient.close(); await deniedFixture.close(); }

    const allowedFixture = routeFixture({ scopes: [specializedScope, "norm:turn"] });
    const allowedClient = await connect(allowedFixture);
    try {
      const allowed = await allowedClient.callTool({ name, arguments: input(name) });
      assert.notEqual(allowed.isError, true, name);
      assert.equal(allowedFixture.calls.length, 1, name);
    } finally { await allowedClient.close(); await allowedFixture.close(); }
  }
});
