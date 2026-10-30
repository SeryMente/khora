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
  if (name === "jules_get_session" || name === "jules_list_activities") return { session_id: "fixture-session" };
  if (name === "jules_create_session") return { source: "sources/github/owner/repo", starting_branch: "main", prompt: "Fixture prompt with acceptance criteria and NO SIMULATION", title: "Contract test" };
  if (name === "jules_send_message") return { session_id: "fixture-session", prompt: "Fixture response" };
  if (name === "jules_approve_plan") return { session_id: "fixture-session", plan_id: "fixture-plan-1", plan_sha256: "7a898feea085c3699a9c15295c5c53d361f6f10bd2847d2bb54f12b863969346" };
  if (name === "jules_list_sources" || name === "jules_list_sessions") return {};
  const business = (name === "khora_leer_volcado" || name === "khora_leer_audio") ? { id: "1" } : name === "khora_buscar_volcados" ? { busqueda: "fixture" } : name === "khora_versiones_volcado" ? { volcado_id: "1" } : {};
  return { ...controls, ...business };
}

test("all 24 real registration shapes generate valid schemas and accept advertised examples", async () => {
  const contracts = await routeContracts();
  assert.equal(contracts.length, 24);
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

test("tools/list exposes Jules read and write actions through their own scopes without norm:turn", async () => {
  const readFixture = routeFixture({ scopes: ["jules:read"] });
  const readClient = await connect(readFixture);
  try {
    const listed = await readClient.listTools();
    const names = listed.tools.map(tool => tool.name).sort();
    assert.deepEqual(names, [
      "jules_get_session", "jules_list_activities", "jules_list_sessions", "jules_list_sources",
    ].sort());
    assert.equal(names.some(name => name.startsWith("khora_norm_")), false);
  } finally { await readClient.close(); await readFixture.close(); }

  const writeFixture = routeFixture({ scopes: ["jules:write"] });
  const writeClient = await connect(writeFixture);
  try {
    const listed = await writeClient.listTools();
    const names = listed.tools.map(tool => tool.name).sort();
    assert.deepEqual(names, ["jules_approve_plan", "jules_create_session", "jules_send_message"].sort());
    assert.equal(names.some(name => name.startsWith("khora_norm_")), false);
  } finally { await writeClient.close(); await writeFixture.close(); }
});

test("real route: HTTP discovery and all 24 calls agree; malformed input cannot reach service", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 24);
    assert.deepEqual(listed.tools.map(x => x.name).sort(), Object.keys(MCP_TOOL_SCOPES).sort());
    for (const tool of listed.tools) {
      const contract = fixture.schemas.get(tool.name as McpToolName)!;
      assert.deepEqual(tool.inputSchema, JSON.parse(JSON.stringify(describeMcpTool(tool.name as McpToolName, contract.description, contract.shape).inputSchema)));
      assert.notEqual((await client.callTool({ name: tool.name, arguments: input(tool.name as McpToolName) })).isError, true, tool.name);
    }
    assert.equal(fixture.calls.length, 30, "Jules message and approval tools preflight session state");
    for (const call of fixture.calls.filter(x => !x.name.endsWith("NormativeTurn") && x.name !== "applyNormativePrinciple")) {
      for (const field of Object.keys(controls)) assert.equal(Object.hasOwn(call.args ?? {}, field), false, call.name);
    }
    const bad = input("khora_norm_verify_turn"); delete (bad.receipt as Record<string, unknown>).output;
    assert.equal((await client.callTool({ name: "khora_norm_verify_turn", arguments: bad })).isError, true);
    assert.equal(fixture.calls.length, 30);
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
  const substantive = Object.keys(MCP_TOOL_SCOPES).filter(n => n !== "khora_mcp_health" && !n.startsWith("khora_norm_") && !n.startsWith("jules_")) as McpToolName[];
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


test("Jules plan approval is blocked unless the session is awaiting plan approval", async () => {
  const fixture = routeFixture();
  const client = await connect(fixture);
  try {
    const result = await client.callTool({
      name: "jules_approve_plan",
      arguments: input("jules_approve_plan"),
    });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /JULES_PLAN_NOT_AWAITING_APPROVAL/);
    assert.equal(fixture.calls.some(call => call.name === "JulesApprovePlan"), false);
  } finally {
    await client.close();
    await fixture.close();
  }
});

test("invalid Jules source names cannot reach the create-session API", async () => {
  const fixture = routeFixture();
  const client = await connect(fixture);
  try {
    const result = await client.callTool({
      name: "jules_create_session",
      arguments: { ...input("jules_create_session"), source: "sources/../other-repo" },
    });
    assert.equal(result.isError, true);
    assert.equal(fixture.calls.some(call => call.name === "JulesCreateSession"), false);
  } finally {
    await client.close();
    await fixture.close();
  }
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
test("configured developer owner gets full Jules-account access without ACL or norm-turn provisioning", async () => {
  const fixture = routeFixture({
    developerSubject: true,
    aclUnavailable: true,
    scopes: ["jules:read", "jules:write"],
  });
  const client = await connect(fixture);
  try {
    const tools = await client.listTools();
    const names = tools.tools.map(tool => tool.name);
    for (const name of [
      "jules_list_sources", "jules_list_sessions", "jules_get_session",
      "jules_list_activities", "jules_create_session", "jules_send_message",
      "jules_approve_plan",
    ]) assert.ok(names.includes(name), name);
    for (const tool of tools.tools.filter(item => item.name.startsWith("jules_"))) {
      assert.equal(Object.hasOwn((tool.inputSchema as any).properties ?? {}, "_norm_turn_token"), false, tool.name);
    }
    assert.equal(names.some(name => name.startsWith("khora_norm_")), false);

    const sources = await client.callTool({ name: "jules_list_sources", arguments: input("jules_list_sources") });
    assert.notEqual(sources.isError, true);
    const sourcePayload = JSON.parse(((sources as any).content?.[0] as any).text);
    assert.deepEqual(sourcePayload.result.sources[0].githubRepo.branches.map((x: any) => x.displayName).sort(), ["main", "restricted"]);

    const sessions = await client.callTool({ name: "jules_list_sessions", arguments: input("jules_list_sessions") });
    assert.notEqual(sessions.isError, true);
    const sessionPayload = JSON.parse(((sessions as any).content?.[0] as any).text);
    assert.equal(sessionPayload.result.sessions.length, 3);

    const created = await client.callTool({
      name: "jules_create_session",
      arguments: { ...input("jules_create_session"), starting_branch: "restricted" },
    });
    assert.notEqual(created.isError, true, JSON.stringify(created));
    const createCall = fixture.calls.find(x => x.name === "JulesCreateSession");
    assert.ok(createCall);
    assert.equal((createCall!.args as any).sourceContext.githubRepoContext.startingBranch, "restricted");
    assert.equal((createCall!.args as any).requirePlanApproval, false, "single configured owner has no unnecessary plan-approval gate");
    assert.deepEqual(fixture.aclSubjects, [], "configured owner does not need per-repository ACL rows");
  } finally { await client.close(); await fixture.close(); }
});

test("Jules source catalogue exposes only exact ACL branches and retains provider pagination", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    const result = await client.callTool({ name: "jules_list_sources", arguments: input("jules_list_sources") });
    assert.notEqual(result.isError, true);
    const payload = JSON.parse(((result as any).content?.[0] as any).text);
    assert.deepEqual(payload.result.sources[0].githubRepo.branches.map((x: any) => x.displayName), ["main"]);
    assert.equal(payload.result.nextPageToken, "fixture-next");
  } finally { await client.close(); await fixture.close(); }
});
test("Jules sessions are filtered by subject/source/branch ACL and unauthorized detail is denied", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    const result = await client.callTool({ name: "jules_list_sessions", arguments: input("jules_list_sessions") });
    const payload = JSON.parse(((result as any).content?.[0] as any).text);
    assert.deepEqual(payload.result.sessions.map((x: any) => x.name), ["sessions/fixture-session"]);
    assert.equal(payload.result.nextPageToken, "fixture-sessions-next");
  } finally { await client.close(); await fixture.close(); }
  const denied = routeFixture({ readAllowed: false }); const deniedClient = await connect(denied);
  try { const result = await deniedClient.callTool({ name: "jules_get_session", arguments: input("jules_get_session") }); assert.equal(result.isError, true); assert.match(JSON.stringify(result), /JULES_ACCESS_DENIED/); }
  finally { await deniedClient.close(); await denied.close(); }
});
test("Jules create validates exact write grant and live source branch before creating", async () => {
  const allowed = routeFixture(); const client = await connect(allowed);
  try {
    const result = await client.callTool({ name: "jules_create_session", arguments: input("jules_create_session") });
    assert.notEqual(result.isError, true);
    const create = allowed.calls.find(x => x.name === "JulesCreateSession"); assert.ok(create);
    assert.equal((create!.args as any).requirePlanApproval, true, "additional subjects retain manual plan approval");
    assert.equal((create!.args as any).automationMode, "AUTO_CREATE_PR");
    const sourceContext = (create!.args as any).sourceContext;
    assert.equal(sourceContext.source, "sources/github/owner/repo");
    assert.equal(sourceContext.githubRepoContext?.startingBranch, "main");
    assert.deepEqual(Object.keys(sourceContext).sort(), ["githubRepoContext", "source"]);
    assert.deepEqual(Object.keys(sourceContext.githubRepoContext).sort(), ["startingBranch"]);
  } finally { await client.close(); await allowed.close(); }
  for (const options of [{ writeAllowed: false }, { sourceBranchExists: false }]) {
    const denied = routeFixture(options); const deniedClient = await connect(denied);
    try { const result = await deniedClient.callTool({ name: "jules_create_session", arguments: input("jules_create_session") }); assert.equal(result.isError, true); assert.equal(denied.calls.some(x => x.name === "JulesCreateSession"), false); }
    finally { await deniedClient.close(); await denied.close(); }
  }
});
test("Jules ACL without an active grant does not call provider listings or session creation", async () => {
  const fixture = routeFixture({ readAllowed: false, writeAllowed: false }); const client = await connect(fixture);
  try {
    for (const name of ["jules_list_sources", "jules_list_sessions"] as const) {
      const result = await client.callTool({ name, arguments: input(name) }); assert.notEqual(result.isError, true);
      const payload = JSON.parse(((result as any).content?.[0] as any).text);
      assert.equal(name === "jules_list_sources" ? payload.result.sources.length : payload.result.sessions.length, 0);
    }
    const create = await client.callTool({ name: "jules_create_session", arguments: input("jules_create_session") }); assert.equal(create.isError, true);
    assert.equal(fixture.calls.some(x => ["JulesListSources", "JulesListSessions", "JulesGetSource", "JulesCreateSession"].includes(x.name)), false);
  } finally { await client.close(); await fixture.close(); }
});
test("Jules read tools deny sessions and activities before provider lookup without a read grant", async () => {
  for (const name of ["jules_get_session", "jules_list_activities"] as const) {
    const fixture = routeFixture({ readAllowed: false }); const client = await connect(fixture);
    try {
      const result = await client.callTool({ name, arguments: input(name) });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result), /JULES_ACCESS_DENIED/);
      assert.equal(fixture.calls.some(x => x.name === "JulesGetSession" || x.name === "JulesListActivitiesPage"), false);
    } finally { await client.close(); await fixture.close(); }
  }
});

test("Jules write tools deny messages and approvals before provider lookup without a write grant", async () => {
  for (const name of ["jules_send_message", "jules_approve_plan"] as const) {
    const fixture = routeFixture({ writeAllowed: false }); const client = await connect(fixture);
    try {
      const result = await client.callTool({ name, arguments: input(name) });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result), /JULES_ACCESS_DENIED/);
      assert.equal(fixture.calls.some(x => x.name === "JulesGetSession" || x.name === "JulesSendMessage" || x.name === "JulesApprovePlan"), false);
    } finally { await client.close(); await fixture.close(); }
  }
});

test("Jules ACL outages fail closed before any provider access for reads or writes", async () => {
  const fixture = routeFixture({ aclUnavailable: true }); const client = await connect(fixture);
  try {
    const cases = [
      ["jules_list_sources", input("jules_list_sources")],
      ["jules_list_sessions", input("jules_list_sessions")],
      ["jules_get_session", input("jules_get_session")],
      ["jules_list_activities", input("jules_list_activities")],
      ["jules_create_session", input("jules_create_session")],
      ["jules_send_message", input("jules_send_message")],
      ["jules_approve_plan", input("jules_approve_plan")],
    ] as const;
    for (const [name, args] of cases) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, name);
      assert.match(JSON.stringify(result), /JULES_ACL_UNAVAILABLE/, name);
    }
    assert.equal(fixture.calls.some(x => x.name.startsWith("Jules")), false);
  } finally { await client.close(); await fixture.close(); }
});
test("Jules session access requires exact source and branch match, and denies missing context", async () => {
  for (const [options, expected] of [
    [{ sessionBranch: "restricted" }, /JULES_ACCESS_DENIED/],
    [{ sessionSource: "sources/github/other/repo" }, /JULES_ACCESS_DENIED/],
    [{ sessionContextValid: false }, /JULES_RESOURCE_CONTEXT_INVALID/],
  ] as const) {
    const fixture = routeFixture(options); const client = await connect(fixture);
    try {
      const result = await client.callTool({ name: "jules_get_session", arguments: input("jules_get_session") });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result), expected);
    } finally { await client.close(); await fixture.close(); }
  }
});

test("Jules cannot create a session for a different branch even when the subject has another grant", async () => {
  const fixture = routeFixture(); const client = await connect(fixture);
  try {
    const result = await client.callTool({ name: "jules_create_session", arguments: { ...input("jules_create_session"), starting_branch: "restricted" } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /JULES_ACCESS_DENIED/);
    assert.equal(fixture.calls.some(x => x.name === "JulesGetSource" || x.name === "JulesCreateSession"), false);
  } finally { await client.close(); await fixture.close(); }
});
test("Jules approval requires the exact current plan id and fingerprint returned by activities", async () => {
  const options = { planApprovalReady: true, activityPagination: true }; const fixture = routeFixture(options); const client = await connect(fixture);
  try {
    const activities = await client.callTool({ name: "jules_list_activities", arguments: input("jules_list_activities") });
    const payload = JSON.parse(((activities as any).content?.[0] as any).text);
    const generated = payload.result.activities[0].planGenerated;
    assert.equal(generated.plan.id, "fixture-plan-1");
    assert.match(generated.plan_sha256, /^[0-9a-f]{64}$/);
    const approved = await client.callTool({ name: "jules_approve_plan", arguments: { ...input("jules_approve_plan"), plan_id: generated.plan.id, plan_sha256: generated.plan_sha256 } });
    assert.notEqual(approved.isError, true, JSON.stringify(approved));
    assert.equal(fixture.calls.filter(x => x.name === "JulesListActivitiesPage").length, 5, "one visible page plus two fully paginated preflight reads");
    assert.equal(fixture.calls.filter(x => x.name === "JulesApprovePlan").length, 1);
  } finally { await client.close(); await fixture.close(); }
});

test("Jules approval blocks when the plan id changes after it was shown", async () => {
  const options: { planApprovalReady?: boolean; currentPlanId?: string } = { planApprovalReady: true }; const fixture = routeFixture(options); const client = await connect(fixture);
  try {
    const activities = await client.callTool({ name: "jules_list_activities", arguments: input("jules_list_activities") });
    const payload = JSON.parse(((activities as any).content?.[0] as any).text);
    const generated = payload.result.activities[0].planGenerated;
    options.currentPlanId = "fixture-plan-replaced";
    const result = await client.callTool({ name: "jules_approve_plan", arguments: { ...input("jules_approve_plan"), plan_id: generated.plan.id, plan_sha256: generated.plan_sha256 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /JULES_PLAN_CHANGED/);
    assert.equal(fixture.calls.some(x => x.name === "JulesApprovePlan"), false);
  } finally { await client.close(); await fixture.close(); }
});

test("Jules approval detects a plan change between the two immediate preflight reads", async () => {
  const options = { planApprovalReady: true, planSecondId: "fixture-plan-replaced" }; const fixture = routeFixture(options); const client = await connect(fixture);
  try {
    const activities = await client.callTool({ name: "jules_list_activities", arguments: input("jules_list_activities") });
    const payload = JSON.parse(((activities as any).content?.[0] as any).text);
    const generated = payload.result.activities[0].planGenerated;
    const result = await client.callTool({ name: "jules_approve_plan", arguments: { ...input("jules_approve_plan"), plan_id: generated.plan.id, plan_sha256: generated.plan_sha256 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /JULES_PLAN_CHANGED/);
    assert.equal(fixture.calls.some(x => x.name === "JulesApprovePlan"), false);
  } finally { await client.close(); await fixture.close(); }
});
test("Jules approval rejects a changed plan fingerprint even when the plan id stays the same", async () => {
  const options = { planApprovalReady: true, planSecondStepDescription: "Changed after first preflight read" };
  const fixture = routeFixture(options); const client = await connect(fixture);
  try {
    const activities = await client.callTool({ name: "jules_list_activities", arguments: input("jules_list_activities") });
    const payload = JSON.parse(((activities as any).content?.[0] as any).text);
    const generated = payload.result.activities[0].planGenerated;
    const result = await client.callTool({ name: "jules_approve_plan", arguments: { ...input("jules_approve_plan"), plan_id: generated.plan.id, plan_sha256: generated.plan_sha256 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /JULES_PLAN_CHANGED/);
    assert.equal(fixture.calls.some(x => x.name === "JulesApprovePlan"), false);
  } finally { await client.close(); await fixture.close(); }
});
test("Jules ACL uses the authenticated OAuth subject, never a caller-supplied identity", async () => {
  const readFixture = routeFixture(); const readClient = await connect(readFixture);
  try {
    const read = await readClient.callTool({ name: "jules_list_sources", arguments: input("jules_list_sources") });
    assert.notEqual(read.isError, true);
    assert.deepEqual(readFixture.aclSubjects, ["fixture-actor"]);
  } finally { await readClient.close(); await readFixture.close(); }
  const writeFixture = routeFixture(); const writeClient = await connect(writeFixture);
  try {
    const write = await writeClient.callTool({ name: "jules_create_session", arguments: input("jules_create_session") });
    assert.notEqual(write.isError, true);
    assert.deepEqual(writeFixture.aclSubjects, ["fixture-actor"]);
  } finally { await writeClient.close(); await writeFixture.close(); }
});
