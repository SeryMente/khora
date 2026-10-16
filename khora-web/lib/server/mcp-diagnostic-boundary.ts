import { randomUUID } from "node:crypto";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { diagnose, diagnosticFailure, McpDiagnosticError, type DiagnosticContext } from "./mcp-diagnostics";
type Audit = (event: any) => Promise<unknown>;
const noAudit: Audit = async () => false;
async function safeAudit(audit: Audit, event: any): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([Promise.resolve().then(() => audit(event)).then(result => result === true), new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 750); })]); }
  catch { return false; } finally { if (timer) clearTimeout(timer); }
}

// Decorate only the public registration API, retaining the SDK's own validation/dispatch.
// Includes SDK-generated validation errors that occur before any tool callback.
export function installMcpDiagnostics(server: Server, correlationId: string, registrarEventoServicio: Audit = noAudit) {
  const register = server.setRequestHandler.bind(server);
  server.setRequestHandler = ((schema: any, handler: any) => {
    const method = schema.shape?.method?.value;
    return register(schema, async (request: any, extra: any) => {
      if (method !== "tools/call") return handler(request, extra);
      const operation = /^khora_[a-z_]{1,60}$/.test(request.params?.name || "") ? request.params.name : "tools/call";
      const context = { operation, correlation_id: correlationId };
      let result: any;
      try { result = normalizeToolResult(await handler(request, extra), context); }
      catch (error) {
        if (error instanceof McpError && error.code === ErrorCode.UrlElicitationRequired) throw error;
        result = diagnosticFailure(error, context);
      }
      const diagnostic = result._meta?.["khora/diagnostic"];
      // Metadata only. No args, token, text, SQL, stack, or raw exception in audit events.
      const auditOk = await safeAudit(registrarEventoServicio, { service: "mcp", operation: "tool." + operation, route: "/api/mcp", method: "MCP", correlationId,
        outcome: result.isError ? "FAILURE" : ["PARTIAL", "STALE", "ABSENT", "REJECTED", "INCOMPLETE"].includes(result._meta?.["khora/result"]) ? "PARTIAL" : "SUCCESS",
        reasonCode: diagnostic?.code || null, metadata: { tool: operation, diagnostic: diagnostic || null } });
      result = { ...result, _meta: { ...result._meta, "khora/audit": auditOk ? "PERSISTED" : "UNAVAILABLE" } }; // Never retry business work for telemetry failure.
      return result;
    });
  }) as typeof server.setRequestHandler;
}

export function normalizeToolResult(result: any, context: DiagnosticContext) {
  if (result?._meta?.["khora/diagnostic"]) return result;
  let payload: any = null;
  const text = result?.content?.find((c: any) => c.type === "text")?.text;
  if (typeof text === "string") { try { payload = JSON.parse(text); } catch { /* plain SDK validation error */ } }
  if (result?.isError || typeof payload?.error === "string" || payload?.error_descifrado === true) {
    const reason = typeof payload?.error === "string" ? payload.error : payload?.error_descifrado ? "MCP_DECRYPTION_FAILED" : payload?.reason || text;
    const failure = diagnosticFailure(reason, context);
    return { ...failure, _meta: { ...result?._meta, ...failure._meta } };
  }
  const verdict = payload?.result?.status || payload?.status;
  const partial = payload?.completo === false || verdict === "DEGRADED";
  const absent = payload?.runtime?.disponible === false;
  const stale = payload?.runtime?.stale === true;
  const empty = payload?.total?.n === 0 || [payload?.volcados, payload?.resultados, payload?.eventos].some(value => Array.isArray(value) && value.length === 0);
  return { ...result, _meta: { ...result?._meta, "khora/result": verdict === "INVALID" ? "REJECTED" : verdict === "INCOMPLETE" ? "INCOMPLETE" : partial ? "PARTIAL" : absent ? "ABSENT" : stale ? "STALE" : empty ? "EMPTY" : "SUCCESS", "khora/correlation_id": context.correlation_id } };
}

export function withHttpDiagnostics<T extends unknown[]>(operation: string, work: (...args: T) => Promise<Response>, registrarEventoServicio: Audit = noAudit) {
  return async (...args: T): Promise<Response> => {
    const correlation_id = randomUUID();
    let response: Response;
    try { response = await work(...args); }
    catch (error) {
      const internal = diagnose(error, { operation, correlation_id });
      const auditOk = await safeAudit(registrarEventoServicio, { service: "mcp", operation, correlationId: correlation_id, outcome: "FAILURE", severity: "ERROR", reasonCode: internal.code, metadata: { diagnostic: internal } });
      const diagnostic = diagnose(new McpDiagnosticError("MCP_INTERNAL_ERROR"), { operation, correlation_id });
      return Response.json({ error: "server_error", error_description: diagnostic.message, diagnostic }, { status: 500, headers: { "Cache-Control": "no-store", "x-khora-correlation-id": correlation_id, "x-khora-audit": auditOk ? "PERSISTED" : "UNAVAILABLE" } });
    }
    if (response.status < 400) return response; // Do not inspect successful credential/content bodies.
    let body: any = {}; try { body = await response.json(); } catch {}
    if (!body || typeof body !== "object") body = {};
    const standard = typeof body.error === "string" && /^(invalid_request|invalid_client|invalid_grant|invalid_scope|invalid_client_metadata|invalid_redirect_uri|unsupported_grant_type|server_error|unauthorized)$/.test(body.error) ? body.error : null;
    const fixedReasons: Record<string, string> = {
      "JSON inválido": "MCP_BODY_INVALID", "Expected JSON body": "MCP_BODY_INVALID", "Expected JSON object": "MCP_BODY_INVALID",
      "Expected application/x-www-form-urlencoded body": "MCP_BODY_INVALID", "Origen no autorizado": "MCP_ORIGIN_DENIED",
      "Missing parameters for authorization_code grant": "MCP_OAUTH_PARAMETERS_REQUIRED", "Missing refresh_token parameter": "MCP_OAUTH_PARAMETERS_REQUIRED",
      "Only HTTPS Notion redirect URIs are allowed": "MCP_OAUTH_REDIRECT_INVALID",
      "PKCE public clients using authorization_code are required": "MCP_OAUTH_METADATA_INVALID",
    };
    const safeReason = [body.error_description, body.error].filter(value => typeof value === "string" && Object.hasOwn(fixedReasons, value)).map(value => fixedReasons[value])[0];
    const manualReason = typeof body.error === "string" && /^MANUAL_TOKEN_(SCOPE_INVALID|SCOPE_REQUIRED|EXPIRY_INVALID|ACTOR_INVALID|ID_REQUIRED|ID_INVALID)$/.test(body.error) ? body.error : null;
    const code = response.status === 401 ? "MCP_ACCESS_DENIED" : safeReason || manualReason || (standard === "invalid_grant" ? "MCP_OAUTH_GRANT_INVALID" : standard === "invalid_scope" ? "MCP_OAUTH_SCOPE_INVALID" : standard === "unsupported_grant_type" ? "MCP_OAUTH_GRANT_UNSUPPORTED" : response.status === 503 ? "MCP_CONFIG_MISSING" : response.status < 500 ? "MCP_PROTOCOL_INVALID" : "MCP_INTERNAL_ERROR");
    const diagnostic = diagnose(code, { operation, correlation_id });
    const internal = typeof body._diagnostic_code === "string" ? diagnose(body._diagnostic_code, { operation, correlation_id }) : diagnostic;
    const auditOk = await safeAudit(registrarEventoServicio, { service: "mcp", operation, correlationId: correlation_id, outcome: "FAILURE", statusCode: response.status, reasonCode: internal.code, metadata: { diagnostic: internal } });
    const headers = new Headers(response.headers); headers.set("x-khora-audit", auditOk ? "PERSISTED" : "UNAVAILABLE"); headers.set("Cache-Control", "no-store"); headers.set("x-khora-correlation-id", correlation_id); headers.delete("content-length");
    if (body.jsonrpc === "2.0" && typeof body.error?.code === "number") {
      return Response.json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: body.error.code, message: diagnostic.message, data: { diagnostic } } }, { status: response.status, headers });
    }
    return Response.json({ error: standard || code, error_description: diagnostic.message, diagnostic }, { status: response.status, headers });
  };
}
