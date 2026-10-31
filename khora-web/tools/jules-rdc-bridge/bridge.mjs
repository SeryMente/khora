import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ISSUER = "https://khora-web.vercel.app";
const MCP_ENDPOINT = ISSUER + "/api/mcp";
const RESOURCE = MCP_ENDPOINT;
const REQUIRED_SCOPE = "jules:read jules:write offline_access";
export const EXPECTED_TOOLS = Object.freeze([
  "jules_list_sources", "jules_list_sessions", "jules_get_session",
  "jules_list_activities", "jules_create_session", "jules_send_message",
  "jules_approve_plan",
]);
const REQUIRED_TOOLS = EXPECTED_TOOLS;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CREDENTIAL_SCRIPT = join(SCRIPT_DIR, "credential.ps1");
const POWERSHELL = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");

function errorWithCode(code) { return Object.assign(new Error(code), { code }); }

function safeCode(error) {
  const value = String(error && (error.code || error.message) || error || "");
  if (/invalid_grant|OAUTH_REFRESH_INACTIVE/i.test(value)) return "KHORA_OAUTH_REFRESH_EXPIRED";
  if (/OAUTH_ACCESS_DENIED|access_denied/i.test(value)) return "KHORA_OAUTH_ACCESS_DENIED";
  if (/401|MCP_AUTH|unauthorized/i.test(value)) return "MCP_AUTH_REJECTED";
  if (/403|insufficient.?scope|MCP_SCOPE/i.test(value)) return "MCP_SCOPE_INSUFFICIENT";
  if (/fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(value)) return "MCP_NETWORK_UNAVAILABLE";
  if (/DPAPI|OAUTH_CREDENTIAL|PowerShell/i.test(value)) return "LOCAL_CREDENTIAL_STORE_FAILED";
  if (typeof error?.code === "string" && /^[A-Z0-9_]{3,64}$/.test(error.code)) return error.code;
  return "MCP_BRIDGE_REQUEST_FAILED";
}

function emit(value) { process.stdout.write(JSON.stringify(value) + "\n"); }

function runCredentialHelper(action, input) {
  if (process.platform !== "win32") throw errorWithCode("WINDOWS_DPAPI_REQUIRED");
  if (!/^(Store|Load|Status|Remove)$/.test(action)) throw errorWithCode("CREDENTIAL_ACTION_INVALID");
  try {
    return execFileSync(POWERSHELL, [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", CREDENTIAL_SCRIPT, "-Action", action,
    ], {
      input: input === undefined ? undefined : input,
      encoding: "utf8", windowsHide: true, timeout: 20000, maxBuffer: 20000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    throw errorWithCode(action === "Load" ? "OAUTH_CREDENTIAL_MISSING_OR_UNREADABLE" : "LOCAL_CREDENTIAL_STORE_FAILED");
  }
}

function loadCredential() {
  const raw = runCredentialHelper("Load");
  let record;
  try { record = JSON.parse(raw); } catch { throw errorWithCode("OAUTH_CREDENTIAL_FORMAT_INVALID"); }
  if (typeof record?.client_id !== "string" ||
      !record.client_id.startsWith("khora-dcr.") ||
      typeof record?.refresh_token !== "string" ||
      record.refresh_token.length < 20 ||
      record.scope !== REQUIRED_SCOPE) {
    throw errorWithCode("OAUTH_CREDENTIAL_FORMAT_INVALID");
  }
  return record;
}

function storeCredential(record) {
  const result = runCredentialHelper("Store", JSON.stringify(record));
  if (!result.includes("OK|DPAPI_CURRENT_USER|READBACK_OK")) throw errorWithCode("LOCAL_CREDENTIAL_STORE_FAILED");
}

function clearCredential() {
  runCredentialHelper("Remove");
}

function randomBase64Url(bytes = 32) { return randomBytes(bytes).toString("base64url"); }
function pkceChallenge(verifier) { return createHash("sha256").update(verifier, "ascii").digest("base64url"); }

function equalState(actual, expected) {
  if (typeof actual !== "string" || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
}

async function postForm(path, values) {
  const response = await fetch(ISSUER + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(values),
    cache: "no-store",
    redirect: "error",
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    const serverCode = typeof body?.error === "string" ? body.error : "HTTP_" + response.status;
    throw errorWithCode(serverCode === "invalid_grant" ? "KHORA_OAUTH_REFRESH_EXPIRED" : "KHORA_OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  if (!body || typeof body.access_token !== "string" ||
      typeof body.refresh_token !== "string" ||
      body.token_type !== "Bearer" ||
      typeof body.expires_in !== "number") {
    throw errorWithCode("KHORA_OAUTH_TOKEN_RESPONSE_INVALID");
  }
  const scopes = new Set(String(body.scope || "").split(/\s+/).filter(Boolean));
  for (const required of REQUIRED_SCOPE.split(" ")) {
    if (!scopes.has(required)) throw errorWithCode("KHORA_OAUTH_SCOPE_MISMATCH");
  }
  if (scopes.size !== REQUIRED_SCOPE.split(" ").length) throw errorWithCode("KHORA_OAUTH_SCOPE_OVERGRANT");
  return body;
}

function startLoopbackCallback() {
  const state = randomBase64Url(32);
  const verifier = randomBase64Url(48);
  const challenge = pkceChallenge(verifier);
  const server = createServer();
  let finish;
  let reject;
  let settled = false;
  const callback = new Promise((resolvePromise, rejectPromise) => {
    finish = resolvePromise;
    reject = rejectPromise;
  });

  server.on("request", (request, response) => {
    const remote = request.socket.remoteAddress || "";
    const localPeer = remote === "127.0.0.1" || remote === "::ffff:127.0.0.1";
    const address = server.address();
    const expectedHost = typeof address === "object" && address ? "127.0.0.1:" + address.port : "";
    if (!localPeer || request.headers.host !== expectedHost) {
      response.writeHead(403, { "Cache-Control": "no-store" }).end("Forbidden");
      return;
    }
    const requestUrl = new URL(request.url || "/", "http://" + expectedHost);
    if (request.method !== "GET" || requestUrl.pathname !== "/oauth/callback") {
      response.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
      return;
    }
    if (settled) {
      response.writeHead(410, { "Cache-Control": "no-store" }).end("Authorization callback already used");
      return;
    }
    if (!equalState(requestUrl.searchParams.get("state"), state)) {
      response.writeHead(400, { "Cache-Control": "no-store" }).end("OAuth state mismatch");
      return;
    }
    const issuer = requestUrl.searchParams.get("iss");
    if (issuer && issuer !== ISSUER) {
      settled = true;
      response.writeHead(400, { "Cache-Control": "no-store" }).end("Unexpected authorization issuer");
      reject(errorWithCode("KHORA_OAUTH_ISSUER_MISMATCH"));
      return;
    }
    const oauthError = requestUrl.searchParams.get("error");
    if (oauthError) {
      settled = true;
      response.writeHead(403, { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" })
        .end("<!doctype html><meta charset=utf-8><title>Khora</title><p>Khora no autorizó el acceso. Puedes cerrar esta ventana.</p>");
      reject(errorWithCode(oauthError === "access_denied" ? "OAUTH_ACCESS_DENIED" : "KHORA_OAUTH_AUTHORIZATION_FAILED"));
      return;
    }
    const code = requestUrl.searchParams.get("code");
    if (!code || code.length > 2048) {
      settled = true;
      response.writeHead(400, { "Cache-Control": "no-store" }).end("Authorization code missing");
      reject(errorWithCode("KHORA_OAUTH_CODE_MISSING"));
      return;
    }
    settled = true;
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    }).end("<!doctype html><html lang='es'><meta charset='utf-8'><title>Khora autorizado</title><body><h2>Autorización completada</h2><p>El acceso seguro a Khora quedó establecido. Puedes cerrar esta ventana.</p></body></html>");
    finish(code);
  });

  const listening = new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", rejectListen);
      resolveListen();
    });
  });

  return {
    state, verifier, challenge, server, callback, listening,
    close: () => new Promise((resolveClose) => {
      try { server.close(() => resolveClose()); } catch { resolveClose(); }
    }),
    rejectTimeout: (ms) => setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(errorWithCode("KHORA_OAUTH_CALLBACK_TIMEOUT"));
      }
    }, ms),
  };
}

function openAuthorizationPage(url) {
  if (process.platform !== "win32") throw errorWithCode("WINDOWS_BROWSER_LAUNCH_REQUIRED");
  const command = "Start-Process -FilePath '" + url.replace(/'/g, "''") + "'";
  const encoded = Buffer.from(command, "utf16le").toString("base64");
  const child = spawn(POWERSHELL, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
    "-EncodedCommand", encoded,
  ], { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => {});
  child.unref();
}

async function authorizeWithKhora() {
  const loopback = startLoopbackCallback();
  await loopback.listening;
  const address = loopback.server.address();
  if (!address || typeof address === "string") throw errorWithCode("KHORA_OAUTH_LOOPBACK_BIND_FAILED");
  const redirectUri = "http://127.0.0.1:" + address.port + "/oauth/callback";

  try {
    const registrationResponse = await fetch(ISSUER + "/api/oauth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_name: "Khora Jules RDC",
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      }),
      cache: "no-store",
      redirect: "error",
    });
    const registration = await registrationResponse.json().catch(() => null);
    if (!registrationResponse.ok ||
        typeof registration?.client_id !== "string" ||
        !registration.client_id.startsWith("khora-dcr.")) {
      throw errorWithCode("KHORA_OAUTH_CLIENT_REGISTRATION_FAILED");
    }

    const authorizationUrl = new URL("/oauth/authorize", ISSUER);
    authorizationUrl.searchParams.set("client_id", registration.client_id);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("code_challenge", loopback.challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("state", loopback.state);
    authorizationUrl.searchParams.set("resource", RESOURCE);
    authorizationUrl.searchParams.set("scope", REQUIRED_SCOPE);

    const timeout = loopback.rejectTimeout(15 * 60 * 1000);
    openAuthorizationPage(authorizationUrl.toString());
    emit({
      event: "authorization_started",
      ok: true,
      mode: "KHORA_OAUTH2_PKCE",
      scopes: ["jules:read", "jules:write"],
      message: "Se abrió la autorización de Khora en el navegador local. La sesión RDC esperará el callback seguro.",
    });

    let code;
    try { code = await loopback.callback; }
    finally { clearTimeout(timeout); }

    const token = await postForm("/api/oauth/token", {
      grant_type: "authorization_code",
      client_id: registration.client_id,
      redirect_uri: redirectUri,
      code,
      code_verifier: loopback.verifier,
      resource: RESOURCE,
      scope: REQUIRED_SCOPE,
    });
    const record = {
      client_id: registration.client_id,
      refresh_token: token.refresh_token,
      scope: REQUIRED_SCOPE,
      stored_at: new Date().toISOString(),
    };
    storeCredential(record);
    return { record, accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  } finally {
    await loopback.close();
  }
}

async function refreshCredential(record) {
  const token = await postForm("/api/oauth/token", {
    grant_type: "refresh_token",
    client_id: record.client_id,
    refresh_token: record.refresh_token,
    resource: RESOURCE,
  });
  const rotated = {
    client_id: record.client_id,
    refresh_token: token.refresh_token,
    scope: REQUIRED_SCOPE,
    stored_at: new Date().toISOString(),
  };
  storeCredential(rotated);
  return { record: rotated, accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
}

function boundedPageSize(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) throw errorWithCode("PAGE_SIZE_INVALID");
  return number;
}

function requiredString(value, name, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw errorWithCode(name + "_INVALID");
  return value.trim();
}

export function buildToolCall(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw errorWithCode("REQUEST_INVALID");
  switch (request.action) {
    case "sources":
      return { name: "jules_list_sources", arguments: {
        page_size: boundedPageSize(request.page_size, 50),
        ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
      }};
    case "sessions":
      return { name: "jules_list_sessions", arguments: {
        page_size: boundedPageSize(request.page_size, 30),
        ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
      }};
    case "get":
      return { name: "jules_get_session", arguments: { session_id: requiredString(request.session_id, "SESSION_ID", 256) }};
    case "activities":
      return { name: "jules_list_activities", arguments: {
        session_id: requiredString(request.session_id, "SESSION_ID", 256),
        page_size: boundedPageSize(request.page_size, 50),
        ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
      }};
    case "create": {
      const source = requiredString(request.source, "SOURCE", 512);
      if (!/^sources\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(source) ||
          source.split("/").some((part) => part === "." || part === "..")) throw errorWithCode("SOURCE_INVALID");
      const starting_branch = requiredString(request.starting_branch, "STARTING_BRANCH", 255);
      const prompt = requiredString(request.prompt, "PROMPT", 10000);
      const title = request.title === undefined ? undefined : requiredString(request.title, "TITLE", 200);
      return { name: "jules_create_session", arguments: { source, starting_branch, prompt, ...(title ? { title } : {}) }};
    }
    case "message":
      return { name: "jules_send_message", arguments: {
        session_id: requiredString(request.session_id, "SESSION_ID", 256),
        prompt: requiredString(request.prompt, "PROMPT", 10000),
      }};
    case "approve": {
      const planSha = requiredString(request.plan_sha256, "PLAN_SHA256", 64).toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(planSha)) throw errorWithCode("PLAN_SHA256_INVALID");
      return { name: "jules_approve_plan", arguments: {
        session_id: requiredString(request.session_id, "SESSION_ID", 256),
        plan_id: requiredString(request.plan_id, "PLAN_ID", 256),
        plan_sha256: planSha,
      }};
    }
    default:
      throw errorWithCode("ACTION_NOT_SUPPORTED");
  }
}

function decodeToolResult(result) {
  const block = Array.isArray(result?.content)
    ? result.content.find((item) => item?.type === "text" && typeof item.text === "string")
    : null;
  if (!block) return { ok: result?.isError !== true, result: result ?? null };
  let payload;
  try { payload = JSON.parse(block.text); }
  catch { return { ok: result?.isError !== true, text: block.text.slice(0, 12000) }; }
  if (result?.isError === true || payload?.ok === false) {
    return { ok: false, diagnostic: payload?.diagnostic ?? payload?.error ?? payload };
  }
  return { ok: true, result: payload?.result ?? payload };
}

async function createMcpClient(accessToken) {
  const client = new Client({ name: "khora-jules-rdc-bridge", version: "0.2.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT), {
    requestInit: { headers: { Authorization: "Bearer " + accessToken } },
  });
  try {
    await client.connect(transport);
    const discovered = await client.listTools();
    const available = new Set((discovered.tools ?? []).map((tool) => tool.name));
    const missing = REQUIRED_TOOLS.filter((name) => !available.has(name));
    if (missing.length) {
      await client.close();
      throw errorWithCode("JULES_TOOLS_INCOMPLETE");
    }
    return client;
  } catch (error) {
    try { await client.close(); } catch {}
    throw error;
  }
}

export async function runBridge() {
  let record;
  let session;
  try {
    record = loadCredential();
    session = await refreshCredential(record);
    record = session.record;
  } catch (error) {
    if (error?.code === "KHORA_OAUTH_REFRESH_EXPIRED" ||
        error?.code === "OAUTH_CREDENTIAL_MISSING_OR_UNREADABLE" ||
        error?.code === "OAUTH_CREDENTIAL_FORMAT_INVALID") {
      try { clearCredential(); } catch {}
      session = await authorizeWithKhora();
      record = session.record;
    } else {
      throw errorWithCode(safeCode(error));
    }
  }

  let client = await createMcpClient(session.accessToken);
  let expiresAt = session.expiresAt;
  emit({
    event: "ready",
    ok: true,
    mode: "RDC_OAUTH_PKCE_CLIENT",
    endpoint: MCP_ENDPOINT,
    scopes: ["jules:read", "jules:write"],
    tools: REQUIRED_TOOLS,
    credentialStorage: "DPAPI_CURRENT_USER",
  });

  const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  for await (const line of input) {
    if (!line.trim()) continue;
    let request;
    try {
      if (line.length > 20000) throw errorWithCode("REQUEST_TOO_LARGE");
      request = JSON.parse(line);
      if (request?.action === "shutdown") {
        emit({ id: request.id ?? null, ok: true, event: "shutdown" });
        input.close();
        break;
      }
      if (Date.now() + 120000 >= expiresAt) {
        try { await client.close(); } catch {}
        session = await refreshCredential(record);
        record = session.record;
        expiresAt = session.expiresAt;
        client = await createMcpClient(session.accessToken);
        emit({ event: "access_refreshed", ok: true, storage: "DPAPI_CURRENT_USER" });
      }
      const call = buildToolCall(request);
      const response = await client.callTool(call);
      emit({ id: request.id ?? null, action: request.action, ...decodeToolResult(response) });
    } catch (error) {
      emit({ id: request?.id ?? null, action: request?.action ?? null, ok: false, code: safeCode(error) });
    }
  }
  try { await client.close(); } catch {}
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  runBridge().catch((error) => {
    emit({ event: "error", ok: false, code: safeCode(error) });
    process.exitCode = 1;
  });
}
