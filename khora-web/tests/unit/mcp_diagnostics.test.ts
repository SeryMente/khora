import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as diagnostics from "../../lib/server/mcp-diagnostics";
import { diagnose, diagnosticFailure, McpDiagnosticError } from "../../lib/server/mcp-diagnostics";
import { normalizeToolResult, withHttpDiagnostics } from "../../lib/server/mcp-diagnostic-boundary";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { fetchNormativeGithub } from "../../lib/server/normative-github";
import { routeFixture } from "./helpers/mcp-route-fixture";
import { MCP_TOOL_SCOPES } from "../../lib/server/mcp-tool-contract";
import { REQUIRED_PLATFORM, REQUIRED_OUTPUT_FORMAT_VERSION } from "../../lib/server/normative-runtime";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const context = { operation: "test", correlation_id: "synthetic-correlation" };
const controls = { _norm_turn_token: "test-token-not-a-real-credential", _thinking_mode: "UNKNOWN", _output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION };
const endpoint = "https://api.github.com/repos/SeryMente/metodologia/commits/main";

async function githubFixture(work: () => Promise<void>, fetcher?: typeof fetch) {
  const token = process.env.KHORA_NORM_GITHUB_TOKEN, original = globalThis.fetch;
  setDbForTesting({ query: async () => ({ rows: [] }) });
  process.env.EP_ALLOWED_EMAIL ||= "test@example.com";
  try { process.env.KHORA_NORM_GITHUB_TOKEN = "synthetic-credential-not-real"; if (fetcher) globalThis.fetch = fetcher; await work(); }
  finally { resetDbForTesting(); globalThis.fetch = original; if (token === undefined) delete process.env.KHORA_NORM_GITHUB_TOKEN; else process.env.KHORA_NORM_GITHUB_TOKEN = token; }
}
test("private normative read requires dedicated credential, never broad token or anonymous fallback", async () => {
  await githubFixture(async () => { delete process.env.KHORA_NORM_GITHUB_TOKEN; await assert.rejects(fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"), { message: "NORM_GITHUB_CREDENTIAL_MISSING" }); }, async () => { throw Error("Network must not run"); });
});
test("normative read sends auth only to the selected GitHub repo and forbids redirects", async () => {
  let calls = 0;
  await githubFixture(async () => {
    const response = await fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"); assert.equal((await response.json()).sha, "synthetic");
    await assert.rejects(fetchNormativeGithub("https://evil.invalid/repos/SeryMente/metodologia/commits/main", "SI_MAIN_FETCH"), /RESPONSE_INVALID/);
    await assert.rejects(fetchNormativeGithub("https://api.github.com/repos/other/repo/commits/main", "SI_MAIN_FETCH"), /RESPONSE_INVALID/); assert.equal(calls, 1);
  }, async (url, init) => { calls++; assert.equal(String(url), endpoint); assert.equal(new Headers(init?.headers).get("authorization"), "Bearer synthetic-credential-not-real"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store"); assert.ok(init?.signal); return Response.json({ sha: "synthetic" }); });
});
for (const [status, headers, code] of [
  [401, {}, "NORM_GITHUB_CREDENTIAL_REJECTED"], [403, {}, "NORM_GITHUB_FORBIDDEN"], [404, {}, "NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE"],
  [403, { "x-ratelimit-remaining": "0" }, "NORM_GITHUB_RATE_LIMITED"], [429, {}, "NORM_GITHUB_RATE_LIMITED"], [500, {}, "NORM_GITHUB_UNAVAILABLE"], [422, {}, "NORM_GITHUB_HTTP_ERROR"],
] as const) test("GitHub " + status + " classified as " + code, async () => {
  await githubFixture(async () => { try { await fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"); assert.fail("must reject"); } catch (e) { const d = diagnose(e, context); assert.equal(d.code, code); assert.equal(d.evidence.upstream_status, status); assert.equal(d.evidence.authentication, "sent"); assert.equal(d.evidence.upstream_operation, "SI_MAIN_FETCH"); assert.ok(!JSON.stringify(d).includes("synthetic-credential")); } }, async () => new Response("secret upstream response must not leak", { status, headers }));
});
test("GitHub network and malformed JSON fail explicitly without leaking upstream body", async () => {
  for (const [fetcher, code] of [[async () => { throw new Error("https://private.invalid/?token=synthetic-secret"); }, "NORM_GITHUB_NETWORK"], [async () => new Response("synthetic-secret-not-json"), "NORM_GITHUB_RESPONSE_INVALID"]] as const) {
    await githubFixture(async () => { await assert.rejects(fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"), { message: code }); }, fetcher);
  }
});
test("GitHub response size is bounded and cannot be mistaken for a valid source", async () => {
  await githubFixture(async () => { await assert.rejects(fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"), /RESPONSE_INVALID/); }, async () => new Response("x".repeat(8 * 1024 * 1024 + 1)));
});
test("GitHub timeout aborts the request and reports the observed timeout", async () => {
  const timer = globalThis.setTimeout;
  try {
    globalThis.setTimeout = ((cb: () => void) => { queueMicrotask(cb); return 0; }) as unknown as typeof setTimeout;
    await githubFixture(async () => { await assert.rejects(fetchNormativeGithub(endpoint, "SI_MAIN_FETCH"), /NORM_GITHUB_TIMEOUT/); }, async (_url, init) => { if (init?.signal?.aborted) throw new Error("aborted"); return new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })); });
  } finally { globalThis.setTimeout = timer; }
});
test("all ten normative GitHub fetches use the authenticated bounded helper", () => {
  const source = fs.readFileSync(path.join(root, "lib/server/norm-check.ts"), "utf8");
  assert.equal((source.match(/await fetchNormativeGithub\(/g) || []).length, 10); assert.doesNotMatch(source, /await fetch\(/);
});

test("unknown errors, SQL details, hostile names and credentials do not enter public diagnostics", () => {
  for (const error of [new Error("synthetic-secret-connection-detail SELECT private"), { name: "synthetic-secret", message: "Bearer synthetic-secret", code: "unknown" }, "TURN_TOKEN_INVALID synthetic-secret", new McpDiagnosticError("synthetic-secret" as any)]) {
    const d = diagnose(error, context); assert.equal(d.code, "MCP_INTERNAL_ERROR"); assert.ok(!JSON.stringify(d).includes("synthetic-secret")); assert.equal(d.retryable, false);
  }
});
test("known normative codes stay exact with condition-specific recovery", () => {
  for (const code of ["TURN_ID_INCOMPLETE", "TURN_ALREADY_CLOSED", "TURN_TOKEN_EXPIRED", "NORMATIVE_RUNTIME_INVALID", "PRINCIPLE_ORDER_MISMATCH"]) assert.equal(diagnose(new Error(code), context).code, code);
  assert.match(diagnose(new Error("TURN_ID_INCOMPLETE"), context).recovery, /juntos/);
  assert.doesNotMatch(diagnose(new Error("TURN_ALREADY_CLOSED"), context).recovery, /Debes abrir\/reabrir/);
});
test("SQL states are classified without echoing SQL or exception text", () => {
  for (const [code, expected] of [["42P01", "MCP_DATABASE_SCHEMA"], ["42703", "MCP_DATABASE_SCHEMA"], ["42501", "MCP_DATABASE_DENIED"], ["08006", "MCP_DATABASE_UNAVAILABLE"]]) {
    const result = diagnose({ code, message: "synthetic-secret SQL connection" }, context); assert.equal(result.code, expected); assert.ok(!JSON.stringify(result).includes("synthetic-secret"));
  }
});
test("partial, empty, stale and rejected verification remain distinguishable from success", () => {
  const result = (payload: object) => normalizeToolResult({ content: [{ type: "text", text: JSON.stringify(payload) }] }, context);
  assert.equal(result({ resultados: [] })._meta["khora/result"], "EMPTY");
  assert.equal(result({ resultados: [], completo: false })._meta["khora/result"], "PARTIAL");
  assert.equal(result({ runtime: { stale: true } })._meta["khora/result"], "STALE");
  assert.equal(result({ result: { status: "INVALID" } })._meta["khora/result"], "REJECTED");
  assert.equal(result({ error_descifrado: true, texto: "synthetic-secret" }).isError, true);
  assert.ok(!JSON.stringify(result({ error: "synthetic-secret", detalle: "private" })).includes("synthetic-secret"));
});

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


async function connect(fixture: ReturnType<typeof routeFixture>) {
  const client = new Client({ name: "diagnostic-fixture", version: "test" });
  await client.connect(new StreamableHTTPClientTransport(new URL(fixture.url), { fetch: fixture.fetch, requestInit: { headers: { Authorization: "Bearer fixture-access" } } })); return client;
}
test("real SDK validation errors are sanitized before being returned to the client", async () => {
  const fixture = routeFixture(), client = await connect(fixture);
  try { const result = await client.callTool({ name: "khora_resumen", arguments: { ...controls, _thinking_mode: "synthetic-secret" } }); assert.equal(result.isError, true); assert.ok(!JSON.stringify(result).includes("synthetic-secret")); assert.equal((result._meta as any)["khora/diagnostic"].code, "MCP_INPUT_INVALID"); assert.equal(fixture.calls.length, 0); }
  finally { await client.close(); await fixture.close(); }
});
test("all twenty tools sanitize unexpected exceptions; health retains upstream evidence", async () => {
  const fixture = routeFixture({ failService: true, healthError: true }), client = await connect(fixture);
  try {
    for (const name of Object.keys(MCP_TOOL_SCOPES)) {
      const args = name === "khora_mcp_health" || name === "khora_norm_open_turn" ? { thinking_mode: "UNKNOWN", output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION }
        : name === "khora_norm_apply_principle" ? { turn_token: controls._norm_turn_token, folio: "P001", status: "N", reason_code: "TEST" }
        : name === "khora_norm_release_turn" ? { turn_token: controls._norm_turn_token }
        : name === "khora_norm_verify_turn" ? { turn_token: controls._norm_turn_token, receipt: receipt() }
        : { ...controls, ...(name === "khora_leer_volcado" ? { id: "1" } : name === "khora_buscar_volcados" ? { busqueda: "test" } : name === "khora_versiones_volcado" ? { volcado_id: "1" } : name === "khora_custodia_revisiones" || name === "khora_custodia_verificar_integridad" ? { session_id: "fixture-session", limite: 20 } : name === "khora_custodia_catalogo" ? { limite: 20 } : {}) };
      const result = await client.callTool({ name, arguments: args }); assert.equal(result.isError, true, name); assert.ok(!JSON.stringify(result).includes("synthetic-secret"), name);
      if (name === "khora_mcp_health") { const d = (result._meta as any)["khora/diagnostic"]; assert.equal(d.code, "NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE"); assert.equal(d.evidence.upstream_status, 404); }
    }
  } finally { await client.close(); await fixture.close(); }
});
test("audit persistence exception never replaces or repeats the business outcome", async () => {
  const fixture = routeFixture({ auditFail: true }), client = await connect(fixture);
  try { const result = await client.callTool({ name: "khora_resumen", arguments: controls }); assert.notEqual(result.isError, true); assert.equal(fixture.calls.length, 1); assert.equal(result._meta?.["khora/audit"], "UNAVAILABLE"); } finally { await client.close(); await fixture.close(); }
});
test("HTTP auth failure preserves standard status/challenge without exposing private reason", async () => {
  const events: any[] = [];
  const work = withHttpDiagnostics("oauth.token", async () => Response.json({ error: "invalid_grant", error_description: "synthetic-secret", _diagnostic_code: "OAUTH_PKCE_MISMATCH" }, { status: 400, headers: { "WWW-Authenticate": "Bearer fixture" } }), async event => { events.push(event); return true; });
  const response = await work(), body = await response.json(); assert.equal(response.status, 400); assert.equal(body.error, "invalid_grant"); assert.equal(response.headers.get("www-authenticate"), "Bearer fixture"); assert.ok(!JSON.stringify(body).includes("synthetic-secret")); assert.ok(!JSON.stringify(body).includes("OAUTH_PKCE_MISMATCH")); assert.equal(events[0].reasonCode, "OAUTH_PKCE_MISMATCH"); assert.equal(events[0].correlationId, body.diagnostic.correlation_id);
});
test("HTTP success bodies are not consumed or transformed; unknown exceptions are safe", async () => {
  const original = Response.json({ access_token: "synthetic-secret" }); assert.equal(await withHttpDiagnostics("oauth.token", async () => original)(), original); assert.equal(original.bodyUsed, false);
  const failure = await withHttpDiagnostics("oauth.token", async () => { throw new Error("synthetic-secret"); })(); assert.equal(failure.status, 500); assert.ok(!(await failure.text()).includes("synthetic-secret"));
});

function contentFixture(query: (sql: string) => Promise<any>) {
  const exports: any = {}, source = fs.readFileSync(path.join(root, "lib/server/mcp-tools.ts"), "utf8");
  const modules: Record<string, any> = { "./mcp-diagnostics": diagnostics, "./mcp-db": { getMcpReadOnlyDb: () => ({ query }) }, "./cripto": { descifrarTexto: () => { throw new Error("synthetic-secret"); } } };
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: (name: string) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } }); return exports;
}
test("unreadable search rows report partial coverage, never a complete empty search", async () => {
  const tools = contentFixture(async sql => sql.includes("information_schema") ? { rows: [] } : { rows: [{ id: "synthetic-id", texto: "synthetic-ciphertext" }] });
  const result = await tools.toolKhoraBuscarVolcados({ busqueda: "test" }); assert.equal(result.total_coincidencias, 0); assert.equal(result.completo, false); assert.equal(result.cobertura.ilegibles, 1); assert.equal(result.cobertura.examinados, 1); assert.equal(result.diagnosticos[0].code, "MCP_DECRYPTION_FAILED");
});
test("failed versions/audit queries are partial, distinguishable from confirmed empty lists", async () => {
  const tools = contentFixture(async sql => { if (sql.includes("FROM volcado WHERE")) return { rowCount: 1, rows: [{ id: "synthetic-id" }] }; throw { code: "42501", message: "synthetic-secret SQL" }; });
  const result = await tools.toolKhoraVersionesVolcado({ volcado_id: "synthetic-id" }); assert.equal(result.completo, false); assert.equal(result.secciones_fallidas.join(","), "versiones,auditoria"); assert.equal(result.diagnosticos.length, 2); assert.ok(!JSON.stringify(result).includes("synthetic-secret"));
});
test("historical decryption failure is flagged and cannot be represented as a successful verbatim read", async () => {
  const tools = contentFixture(async sql => sql.includes("information_schema") ? { rows: [] } : sql.includes("FROM volcado_version") ? { rowCount: 1, rows: [{ version: 1, texto: "synthetic-ciphertext" }] } : { rowCount: 1, rows: [{ id: "synthetic-id" }] });
  const result = await tools.toolKhoraLeerVolcado({ id: "synthetic-id", version: 1 }); assert.equal(result.error_descifrado, true); assert.equal(result.diagnosticos[0].code, "MCP_DECRYPTION_FAILED"); const normalized = normalizeToolResult({ content: [{ type: "text", text: JSON.stringify(result) }] }, context); assert.equal(normalized.isError, true);
});

test("fixed HTTP input errors have actionable safe diagnoses; hostile details remain redacted", async () => {
  for (const [body, code] of [[{error:"invalid_request",error_description:"Missing refresh_token parameter"}, "MCP_OAUTH_PARAMETERS_REQUIRED"], [{error:"MANUAL_TOKEN_EXPIRY_INVALID"}, "MANUAL_TOKEN_EXPIRY_INVALID"], [{error:"invalid_grant",_diagnostic_code:"OAUTH_CODE_INACTIVE"}, "MCP_OAUTH_GRANT_INVALID"], [{error:"invalid_client_metadata",error_description:"Expected JSON object"}, "MCP_BODY_INVALID"], [null, "MCP_PROTOCOL_INVALID"], [{error:"__proto__"}, "MCP_PROTOCOL_INVALID"]] as const) {
    const response = await withHttpDiagnostics("oauth.fixture", async () => Response.json(body, {status:400}))();
    assert.equal((await response.json()).diagnostic.code, code);
  }
  assert.equal(diagnose("SI_PRINCIPLE_STATE_INVALID:P001", context).code, "SI_PRINCIPLE_STATE_INVALID");
  assert.equal(diagnose("No hay URL de base de datos disponible para MCP.", context).code, "MCP_DATABASE_CONFIG_MISSING");
});
test("consent denial does not disclose either account in a redirect", () => {
  const source = fs.readFileSync(path.join(root, "app/oauth/authorize/page.tsx"), "utf8");
  assert.doesNotMatch(source, /error_description:.*(?:userEmail|config.allowedEmail)/);
  assert.match(source, /userEmail.toLowerCase\(\) !== config.allowedEmail.toLowerCase\(\)/);
});

test("audit false is explicit, even when no exception is thrown", async () => {
  const response = await withHttpDiagnostics("fixture", async () => Response.json({error:"invalid_request"},{status:400}), async () => false)();
  assert.equal(response.headers.get("x-khora-audit"), "UNAVAILABLE");
  const result = normalizeToolResult({content:[{type:"text",text:JSON.stringify({runtime:{disponible:false,stale:true}})}]}, context);
  assert.equal(result._meta["khora/result"], "ABSENT");
});


test("every known diagnostic explains the problem without repeating its technical code", () => {
  const source = fs.readFileSync(path.join(root, "lib/server/mcp-diagnostics.ts"), "utf8");
  const definitions = source.slice(0, source.indexOf("export function diagnose"));
  const codes = new Set([...definitions.matchAll(/\b(?:NORM_GITHUB|MCP|MANUAL_TOKEN|OAUTH|TURN|SI|METHODOLOGY|PRINCIPLE|PRINCIPLES|APPLICATION_LOG|EVIDENCE|MANIFEST|NORMATIVE|OUTPUT|RECEIPT)_[A-Z_]+\b/g)].map(match => match[0]));
  for (const suffix of ["INVALID_FORMAT", "INVALID_HEADER", "INVALID_SIGNATURE", "INVALID_PAYLOAD", "EXPIRED"]) codes.add("TURN_TOKEN_" + suffix);
  let checked = 0;
  for (const code of codes) {
    const d = diagnose(code, context); if (d.code !== code) continue;
    checked++; assert.ok(d.message.length > 15 && d.message.length <= 230, code);
    assert.ok(d.recovery.length > 15 && d.recovery.length <= 230, code);
    assert.ok(!d.message.includes(code), code); assert.ok(!d.recovery.includes(code), code);
    assert.doesNotMatch(d.message + d.recovery, /scope|Bearer|issuer|grant|payload|snapshot|ledger|runtime|challenge|normativo|normativa|correlacionad|recurso|metadatos/i, code);
  }
  assert.ok(checked >= 130, String(checked));
});
test("private instructions failures name the repository without claiming that every 404 is a missing credential", () => {
  const missing = diagnose("NORM_GITHUB_CREDENTIAL_MISSING", context);
  assert.match(missing.message, /falta la credencial/); assert.match(missing.recovery, /SeryMente\/metodologia/);
  const denied = diagnose("NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE", context);
  assert.match(denied.message, /encontrar o abrir/); assert.match(denied.message, /no permite distinguir/);
  assert.doesNotMatch(denied.message, /falta la credencial|no existe|fue borrad/);
  assert.match(diagnose("MCP_INTERNAL_ERROR", context).message, /todavía no sabe explicar/);
});
