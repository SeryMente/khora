import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MCP_ENDPOINT = "https://khora-web.vercel.app/api/mcp";
export const EXPECTED_TOOLS = Object.freeze([
  "jules_list_sources",
  "jules_list_sessions",
  "jules_get_session",
  "jules_list_activities",
  "jules_create_session",
  "jules_send_message",
  "jules_approve_plan",
]);

function safeCode(error) {
  const value = String(error?.message ?? error ?? "");
  if (/401|MCP_AUTH|unauthorized/i.test(value)) return "MCP_AUTH_REJECTED";
  if (/403|insufficient.?scope|MCP_SCOPE/i.test(value)) return "MCP_SCOPE_INSUFFICIENT";
  if (/fetch failed|ECONN|ETIMEDOUT|ENOTFOUND/i.test(value)) return "MCP_NETWORK_UNAVAILABLE";
  return "MCP_BRIDGE_REQUEST_FAILED";
}

function boundedPageSize(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    throw Object.assign(new Error("PAGE_SIZE_INVALID"), { code: "PAGE_SIZE_INVALID" });
  }
  return number;
}

function requiredString(value, name, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw Object.assign(new Error(name + "_INVALID"), { code: name + "_INVALID" });
  }
  return value.trim();
}

export function buildToolCall(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw Object.assign(new Error("REQUEST_INVALID"), { code: "REQUEST_INVALID" });
  }
  switch (request.action) {
    case "sources":
      return {
        name: "jules_list_sources",
        arguments: {
          page_size: boundedPageSize(request.page_size, 50),
          ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
        },
      };
    case "sessions":
      return {
        name: "jules_list_sessions",
        arguments: {
          page_size: boundedPageSize(request.page_size, 30),
          ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
        },
      };
    case "get":
      return {
        name: "jules_get_session",
        arguments: { session_id: requiredString(request.session_id, "SESSION_ID", 256) },
      };
    case "activities":
      return {
        name: "jules_list_activities",
        arguments: {
          session_id: requiredString(request.session_id, "SESSION_ID", 256),
          page_size: boundedPageSize(request.page_size, 50),
          ...(request.page_token ? { page_token: requiredString(request.page_token, "PAGE_TOKEN", 4096) } : {}),
        },
      };
    case "create": {
      const source = requiredString(request.source, "SOURCE", 512);
      if (!/^sources\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(source) ||
          source.split("/").some((part) => part === "." || part === "..")) {
        throw Object.assign(new Error("SOURCE_INVALID"), { code: "SOURCE_INVALID" });
      }
      const starting_branch = requiredString(request.starting_branch, "STARTING_BRANCH", 255);
      const prompt = requiredString(request.prompt, "PROMPT", 10000);
      const title = request.title === undefined ? undefined : requiredString(request.title, "TITLE", 200);
      return {
        name: "jules_create_session",
        arguments: { source, starting_branch, prompt, ...(title ? { title } : {}) },
      };
    }
    case "message":
      return {
        name: "jules_send_message",
        arguments: {
          session_id: requiredString(request.session_id, "SESSION_ID", 256),
          prompt: requiredString(request.prompt, "PROMPT", 10000),
        },
      };
    case "approve": {
      const planSha = requiredString(request.plan_sha256, "PLAN_SHA256", 64).toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(planSha)) {
        throw Object.assign(new Error("PLAN_SHA256_INVALID"), { code: "PLAN_SHA256_INVALID" });
      }
      return {
        name: "jules_approve_plan",
        arguments: {
          session_id: requiredString(request.session_id, "SESSION_ID", 256),
          plan_id: requiredString(request.plan_id, "PLAN_ID", 256),
          plan_sha256: planSha,
        },
      };
    }
    default:
      throw Object.assign(new Error("ACTION_NOT_SUPPORTED"), { code: "ACTION_NOT_SUPPORTED" });
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

function emit(value, bearer) {
  let output = JSON.stringify(value);
  if (bearer) output = output.split(bearer).join("[REDACTED]");
  process.stdout.write(output + "\n");
}

export async function runBridge() {
  const bearer = process.env.KHORA_MCP_BEARER;
  if (typeof bearer !== "string" || !bearer.startsWith("khora_mcp_v1_") || bearer.length < 40) {
    throw Object.assign(new Error("LOCAL_BEARER_MISSING_OR_INVALID"), { code: "LOCAL_BEARER_MISSING_OR_INVALID" });
  }

  const client = new Client(
    { name: "khora-jules-rdc-bridge", version: "0.1.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT), {
    requestInit: { headers: { Authorization: "Bearer " + bearer } },
  });

  try {
    await client.connect(transport);
    const discovered = await client.listTools();
    const available = new Set((discovered.tools ?? []).map((tool) => tool.name));
    const missing = EXPECTED_TOOLS.filter((name) => !available.has(name));
    if (missing.length) {
      emit({ event: "error", ok: false, code: "JULES_TOOLS_INCOMPLETE", missing }, bearer);
      process.exitCode = 2;
      return;
    }

    emit({
      event: "ready",
      ok: true,
      mode: "RDC_STDIO_CLIENT",
      endpoint: MCP_ENDPOINT,
      tools: EXPECTED_TOOLS,
    }, bearer);

    const input = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
    for await (const line of input) {
      if (!line.trim()) continue;
      let request;
      try {
        if (line.length > 20000) {
          throw Object.assign(new Error("REQUEST_TOO_LARGE"), { code: "REQUEST_TOO_LARGE" });
        }
        request = JSON.parse(line);
        if (request?.action === "shutdown") {
          emit({ id: request.id ?? null, ok: true, event: "shutdown" }, bearer);
          input.close();
          break;
        }
        const call = buildToolCall(request);
        const response = await client.callTool(call);
        const decoded = decodeToolResult(response);
        emit({ id: request.id ?? null, action: request.action, ...decoded }, bearer);
      } catch (error) {
        emit({
          id: request?.id ?? null,
          action: request?.action ?? null,
          ok: false,
          code: typeof error?.code === "string" ? error.code : safeCode(error),
        }, bearer);
      }
    }
  } finally {
    try { await client.close(); } catch {}
    process.env.KHORA_MCP_BEARER = "";
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  runBridge().catch((error) => {
    const code = typeof error?.code === "string" ? error.code : safeCode(error);
    process.stdout.write(JSON.stringify({ event: "error", ok: false, code }) + "\n");
    process.exitCode = 1;
  });
}
