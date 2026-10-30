import { toolKhoraListarAudios, toolKhoraLeerAudio } from "@/lib/server/mcp-audios";
import {
  approvePlan as julesApprovePlan,
  createSession as julesCreateSession,
  getSession as julesGetSession,
  listActivitiesPage as julesListActivitiesPage,
  listSessions as julesListSessions,
  listSources as julesListSources,
  getSource as julesGetSource,
  normalizeSourceName,
  sendMessage as julesSendMessage,
} from "@/lib/jules/client";
import { registrarEventoServicio } from "@/lib/server/service-observability";
import { createHash, randomUUID } from "node:crypto";
import { McpDiagnosticError, diagnosticFailure, diagnose } from "@/lib/server/mcp-diagnostics";
import { installMcpDiagnostics, withHttpDiagnostics } from "@/lib/server/mcp-diagnostic-boundary";
// @l0 L0-002 §4 · @req MCP-ROUTE-01/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";
import { verifyJwtDetailed } from "@/lib/server/jwt";
import { obtenerGeneracionRevocacion } from "@/lib/server/oauth";
import { isProductionEnv } from "@/lib/server/mcp-db";
import { isJulesDeveloperSubject, listJulesSourceGrants, requireJulesSourceGrant, type JulesAccessMode, type JulesSourceGrant } from "@/lib/server/jules-access";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { describeMcpTool, type McpToolName } from "@/lib/server/mcp-tool-contract";
import { normativeReceiptSchema } from "@/lib/server/normative-receipt-schema";
import {
  toolKhoraResumen,
  toolKhoraListarVolcados,
  toolKhoraLeerVolcado,
  toolKhoraBuscarVolcados,
  toolKhoraVersionesVolcado,
} from "@/lib/server/mcp-tools";
import { toolKhoraUiReview } from "@/lib/server/mcp-ui-review";
import { toolKhoraEstadoVivo, toolKhoraEventosRecientes, toolKhoraObservacionInstantanea, toolKhoraEventosDesde } from "@/lib/server/mcp-observability";
import { assertNormativeTurnOpen, openNormativeTurn, applyNormativePrinciple, verifyNormativeTurn, releaseNormativeTurn } from "@/lib/server/mcp-normative";
import { authenticateManualMcpToken, MANUAL_MCP_TOKEN_PREFIX } from "@/lib/server/mcp-manual-token";
import { getCurrentSiSnapshot, getCurrentMethodologySnapshot, getCurrentVerifierInfo } from "@/lib/server/norm-check";
import { assertNormativeRuntimeContext, REASONING_MODES, REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM, type ReasoningMode } from "@/lib/server/normative-runtime";

export const runtime = "nodejs";

function makeUnauthorizedResponse(config: ReturnType<typeof getMcpConfig>, reason = "MCP_AUTH_CLAIMS_INVALID") {
  const metadataUrl = config
    ? `${config.issuer}/.well-known/oauth-protected-resource`
    : "";
  return new NextResponse(
    JSON.stringify({ error: "unauthorized", error_description: "Valid Bearer token required", _diagnostic_code: reason }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}", scope="runtime:read"`,
      },
    }
  );
}

function scopeFailure(config: ReturnType<typeof getMcpConfig>, requiredScope: string, correlation_id: string) {
  const metadataUrl = config
    ? `${config.issuer}/.well-known/oauth-protected-resource`
    : "";
  return {
    ...diagnosticFailure("MCP_SCOPE_REQUIRED", { operation: "authorization", correlation_id }),
    _meta: {
      ...diagnosticFailure("MCP_SCOPE_REQUIRED", { operation: "authorization", correlation_id })._meta,
      "mcp/www_authenticate": [
        `Bearer resource_metadata="${metadataUrl}", error="insufficient_scope", error_description="Se requiere ${requiredScope}"`,
      ],
    },
  };
}

const NORM_TURN_TOKEN = z.string().min(16).describe(
  "Token del ciclo normativo emitido por khora_norm_open_turn. Obligatorio para toda herramienta MCP sustantiva."
);
const NORM_THINKING_MODE = z.enum(REASONING_MODES).describe(
  "Modo de razonamiento observado para el turno. Usa THINKING cuando la plataforma lo exponga; usa UNKNOWN/UNAVAILABLE cuando no exista una señal operativa. Es metadato, no bloquea la salida."
);
const NORM_OUTPUT_FORMAT_VERSION = z.literal(REQUIRED_OUTPUT_FORMAT_VERSION);

function withNormTurn<T extends z.ZodRawShape>(fields: T): T & { _norm_turn_token: typeof NORM_TURN_TOKEN; _thinking_mode: typeof NORM_THINKING_MODE; _output_format_version: typeof NORM_OUTPUT_FORMAT_VERSION } {
  return {
    ...fields,
    _norm_turn_token: NORM_TURN_TOKEN,
    _thinking_mode: NORM_THINKING_MODE,
    _output_format_version: NORM_OUTPUT_FORMAT_VERSION,
  };
}

function withoutNormTurn(args: Record<string, unknown>) {
  const {
    _norm_turn_token: _ignoredToken,
    _thinking_mode: _ignoredThinking,
    _output_format_version: _ignoredFormat,
    ...rest
  } = args;
  return rest;
}

async function requireNormativeTurn(
  actor: string,
  turnToken: unknown,
  thinkingMode: unknown,
  outputFormatVersion: unknown,
  context: { operation: string; correlation_id: string },
) {
  if (typeof turnToken !== "string") return diagnosticFailure("TURN_TOKEN_INVALID", context);
  try {
    assertNormativeRuntimeContext({
      platform: REQUIRED_PLATFORM,
      reasoning_mode: thinkingMode,
      output_format_version: outputFormatVersion,
    });
    await assertNormativeTurnOpen(actor, turnToken, {
      platform: REQUIRED_PLATFORM,
      reasoning_mode: thinkingMode as ReasoningMode,
      output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
    });
    return null;
  } catch (error) {
    const result = diagnosticFailure(error, context);
    return { ...result, _meta: { ...result._meta, category: "NORMATIVE_TURN_REQUIRED" } };
  }
}

async function handleMcpRequest(req: NextRequest) {
  const correlation_id = randomUUID();
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json(
      { error: "server_error", error_description: "MCP configuration missing" },
      { status: 503 }
    );
  }

  // §7: En producción, si falta KHORA_READONLY_DATABASE_URL, responder 503
  if (isProductionEnv() && !process.env.KHORA_READONLY_DATABASE_URL) {
    return NextResponse.json(
      { error: "server_error", error_description: "KHORA_READONLY_DATABASE_URL mandatory in production" },
      { status: 503 }
    );
  }

  // §B.2 & §B.3: Validar Token Bearer
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return makeUnauthorizedResponse(config, "MCP_AUTH_MISSING");
  }

  const token = authHeader.substring(7).trim();
  let actor: string;
  let scopes: string[];
  let tokenGeneration: number;
  const manualToken = token.startsWith(MANUAL_MCP_TOKEN_PREFIX)
    ? await authenticateManualMcpToken(token)
    : null;

  if (manualToken) {
    if (manualToken.resource !== config.canonicalUrl) {
      return makeUnauthorizedResponse(config, "MCP_AUTH_RESOURCE_MISMATCH");
    }
    actor = manualToken.usuario;
    scopes = manualToken.scope.split(/\s+/).filter(Boolean);
    tokenGeneration = manualToken.generacion;
  } else {
    if (token.startsWith(MANUAL_MCP_TOKEN_PREFIX)) return makeUnauthorizedResponse(config, "MCP_MANUAL_TOKEN_INACTIVE");
    const verified = verifyJwtDetailed(token, config.jwtSecret);
    if (!verified.ok) return makeUnauthorizedResponse(config, "MCP_AUTH_" + verified.error.toUpperCase());
    const payload = verified.payload;

    // Verificar issuer (iss)
    if (payload.iss !== config.issuer) {
      return makeUnauthorizedResponse(config, "MCP_AUTH_ISSUER_MISMATCH");
    }

    // Verificar audiencia (aud)
    if (payload.aud !== config.canonicalUrl) {
      return makeUnauthorizedResponse(config, "MCP_AUTH_RESOURCE_MISMATCH");
    }

    scopes = (payload.scope || "").split(/\s+/).filter(Boolean);
    actor = payload.sub;
    tokenGeneration = payload.gen;
  }

  // El Bearer puede ser OAuth (JWT) o un token manual opaco gestionado por KHORA.
  if (
    !actor ||
    !Number.isSafeInteger(tokenGeneration) ||
    (!scopes.includes("volcados:read") && !scopes.includes("runtime:read") && !scopes.includes("norm:turn") && !scopes.includes("jules:read") && !scopes.includes("jules:write"))
  ) {
    return makeUnauthorizedResponse(config);
  }

  const requireScope = (scope: "volcados:read" | "runtime:read" | "norm:turn" | "jules:read" | "jules:write") =>
    scopes.includes(scope)
      ? null
      : scopeFailure(config, scope, correlation_id);

  // Verificar revocación de generación para ambos tipos de Bearer.
  const currentGen = await obtenerGeneracionRevocacion(actor);
  if (tokenGeneration !== currentGen) {
    return makeUnauthorizedResponse(config, "MCP_AUTH_REVOKED");
  }

  // Instanciar servidor MCP en modo sin estado
  const mcpServer = new McpServer(
    {
      name: "khora-mcp",
      version: "1.3.0",
    },
    {
      instructions:
        "ADAPTIVE NORMATIVE GATE: cuando KHORA esta disponible, ejecuta HEALTH MCP -> OPEN TURN -> aplica cada principio mediante khora_norm_apply_principle en el orden devuelto -> VERIFY -> RELEASE antes de emitir la salida. " +
        `La salida visible de cada turno debe cumplir el contrato ${REQUIRED_OUTPUT_FORMAT_VERSION} cualquiera que sea el escenario. ` +
        "Si KHORA no esta disponible o no puede verificarse, continua la respuesta sin inventar verificacion y declara K: OFF. " +
        "Si KHORA devuelve VERIFIED_RELEASE, declara K: ✓. Si devuelve un fallo normativo, declara K: ! o K: ? segun corresponda. " +
        "El modo de razonamiento es metadato operativo y no debe presentarse como prueba del pensamiento interno.",
    },
  );

  installMcpDiagnostics(mcpServer.server, correlation_id, registrarEventoServicio);
  const toolsList: ReturnType<typeof describeMcpTool>[] = [];

  const gatedTool = (
    name: McpToolName,
    description: string,
    inputSchema: z.ZodRawShape,
    handler: (args: any) => Promise<any>,
  ) => {
    const observedHandler = async (args: any, requireTurn: boolean) => {
      const context = { operation: name, correlation_id };
      try {
        if (requireTurn) {
          const denied = await requireNormativeTurn(actor, args._norm_turn_token, args._thinking_mode, args._output_format_version, context);
          if (denied) return denied;
        }
        return await handler(requireTurn ? withoutNormTurn(args) : args);
      } catch (error) { return diagnosticFailure(error, context); }
    };

    if (name === "khora_mcp_health" || name === "khora_norm_open_turn" || name === "khora_norm_apply_principle" || name === "khora_norm_verify_turn" || name === "khora_norm_release_turn") {
      toolsList.push(describeMcpTool(name, description, inputSchema));
      return mcpServer.tool(name, description, inputSchema, async (args: any) => observedHandler(args, false));
    }

    const effectiveSchema = withNormTurn(inputSchema);
    toolsList.push(describeMcpTool(name, description, effectiveSchema));
    return mcpServer.tool(
      name,
      description,
      effectiveSchema,
      async (args: any) => observedHandler(args, true),
    );
  };

  // Jules has its own scopes; the single configured developer owner does not need a normative-turn token for routine development actions.
  const julesTool = (name: McpToolName, description: string, inputSchema: z.ZodRawShape, handler: (args: any) => Promise<any>) => {
    toolsList.push(describeMcpTool(name, description, inputSchema));
    return mcpServer.tool(name, description, inputSchema, async (args: any) => {
      try { return await handler(args); }
      catch (error) { return diagnosticFailure(error, { operation: name, correlation_id }); }
    });
  };

  // Jules: herramientas bidireccionales sujetas a scopes propios y, para usuarios adicionales, ACL exacta por sujeto, fuente y rama.
  const safeJulesResult = async (operation: string, call: () => Promise<unknown>) => {
    try { const result = await call(); return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, result: result ?? null }) }] }; }
    catch (error) {
      const detail = error && typeof error === "object" ? error as { status?: unknown; message?: unknown } : {};
      const status = typeof detail.status === "number" && Number.isInteger(detail.status) ? detail.status : null;
      const keyMissing = detail.message === "Jules API key is not configured.";
      const knownCode = typeof detail.message === "string" && /^JULES_[A-Z0-9_]+$/.test(detail.message) ? detail.message : null;
      const code = keyMissing ? "JULES_API_KEY_MISSING" : knownCode ? knownCode : status === 401 || status === 403 ? "JULES_API_AUTH_REJECTED" : status === 429 ? "JULES_RATE_LIMITED" : "JULES_API_FAILED";
      return diagnosticFailure(new McpDiagnosticError(code, status !== null && status > 0 ? { upstream_status: status } : {}), { operation, correlation_id });
    }
  };
  const sessionResource = (session: any): { source: string; branch: string } => {
    try {
      const source = normalizeSourceName(session?.sourceContext?.source);
      const branch = session?.sourceContext?.githubRepoContext?.startingBranch;
      if (typeof branch !== "string" || !branch || branch.length > 255 || branch !== branch.trim()) throw new Error("invalid branch");
      return { source, branch };
    } catch { throw new McpDiagnosticError("JULES_RESOURCE_CONTEXT_INVALID"); }
  };
  const requireSessionAccess = async (sessionId: string, mode: JulesAccessMode) => {
    const developerOwner = isJulesDeveloperSubject(actor);
    const grants = developerOwner ? [] : await listJulesSourceGrants(actor, mode);
    if (!developerOwner && !grants.length) throw new McpDiagnosticError("JULES_ACCESS_DENIED");
    const session = await julesGetSession(sessionId);
    const resource = sessionResource(session);
    if (!developerOwner && !grants.some(grant => grant.source === resource.source && grant.branch === resource.branch)) {
      throw new McpDiagnosticError("JULES_ACCESS_DENIED");
    }
    return session;
  };
  const stableJson = (value: any): string => {
    if (value === null || typeof value !== "object") {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) throw new McpDiagnosticError("JULES_PLAN_NOT_FOUND");
      return serialized;
    }
    if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableJson(value[key])).join(",") + "}";
  };
  const planSha256 = (plan: unknown): string => createHash("sha256").update(stableJson(plan)).digest("hex");
  const readCurrentPlan = async (sessionId: string) => {
    const activities: any[] = [];
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;
    for (let pageIndex = 0; pageIndex < 100; pageIndex++) {
      const page = await julesListActivitiesPage(sessionId, 100, pageToken);
      activities.push(...(Array.isArray(page.activities) ? page.activities : []));
      const next = page.nextPageToken;
      if (!next) break;
      if (seenTokens.has(next)) throw new McpDiagnosticError("JULES_PLAN_ACTIVITY_PAGINATION_FAILED");
      seenTokens.add(next);
      pageToken = next;
      if (pageIndex === 99) throw new McpDiagnosticError("JULES_PLAN_ACTIVITY_PAGINATION_FAILED");
    }
    const plans = activities.flatMap(activity => {
      const plan = activity?.planGenerated?.plan;
      if (!plan || typeof plan.id !== "string" || !plan.id) return [];
      const timestamp = Date.parse(plan.createTime ?? activity.createTime ?? "");
      if (!Number.isFinite(timestamp)) return [];
      return [{ plan, timestamp }];
    }).sort((a, b) => a.timestamp - b.timestamp);
    const latest = plans.at(-1)?.plan;
    if (!latest) throw new McpDiagnosticError("JULES_PLAN_NOT_FOUND");
    return { plan_id: latest.id as string, plan_sha256: planSha256(latest), plan: latest, activities };
  };
  const isSessionAllowed = (session: any, grants: JulesSourceGrant[]) => {
    try { const resource = sessionResource(session); return grants.some(g => g.source === resource.source && g.branch === resource.branch); }
    catch { return false; }
  };
  julesTool("jules_list_sources", "El propietario desarrollador consulta las fuentes y ramas disponibles en su cuenta Jules; otros sujetos se limitan a concesiones ACL.", {
    page_size: z.number().int().min(1).max(100).optional().describe("Número de fuentes (1-100; predeterminado 50)"),
    page_token: z.string().max(4096).optional().describe("Token nextPageToken de la página anterior"),
  }, async (args: any) => {
    const denied = requireScope("jules:read"); if (denied) return denied;
    return safeJulesResult("jules_list_sources", async () => {
      const developerOwner = isJulesDeveloperSubject(actor);
      const grants = developerOwner ? [] : await listJulesSourceGrants(actor, "read");
      if (!developerOwner && !grants.length) return { sources: [] };
      const page = await julesListSources(args.page_size ?? 50, args.page_token);
      const sources = (page.sources ?? []).flatMap((source: any) => {
        const allowed = new Set(grants.filter(g => g.source === source.name).map(g => g.branch));
        if ((!developerOwner && !allowed.size) || !source.githubRepo) return [];
        const upstream = Array.isArray(source.githubRepo.branches) ? source.githubRepo.branches : [];
        const available = new Map<string, any>();
        for (const branch of [...upstream, ...(source.githubRepo.defaultBranch ? [source.githubRepo.defaultBranch] : [])]) {
          if (typeof branch?.displayName === "string") available.set(branch.displayName, branch);
        }
        const branches = [...available.values()].filter((b: any) => developerOwner || allowed.has(b.displayName));
        if (!branches.length) return [];
        const defaultBranch = source.githubRepo.defaultBranch && (developerOwner || allowed.has(source.githubRepo.defaultBranch.displayName)) ? available.get(source.githubRepo.defaultBranch.displayName) : undefined;
        return [{ ...source, githubRepo: { ...source.githubRepo, branches, ...(defaultBranch ? { defaultBranch } : { defaultBranch: undefined }) } }];
      });
      return { ...page, sources };
    });
  });
  julesTool("jules_list_sessions", "Lista únicamente sesiones de fuentes y ramas autorizadas; conserva nextPageToken.", {
    page_size: z.number().int().min(1).max(100).optional().describe("Número de sesiones (1-100; predeterminado 30)"),
    page_token: z.string().max(4096).optional().describe("Token nextPageToken de la página anterior"),
  }, async (args: any) => {
    const denied = requireScope("jules:read"); if (denied) return denied;
    return safeJulesResult("jules_list_sessions", async () => {
      const developerOwner = isJulesDeveloperSubject(actor);
      const grants = developerOwner ? [] : await listJulesSourceGrants(actor, "read");
      if (!developerOwner && !grants.length) return { sessions: [] };
      const page = await julesListSessions(args.page_size ?? 30, args.page_token);
      return { ...page, sessions: developerOwner ? (page.sessions ?? []).filter((session: any) => { try { sessionResource(session); return true; } catch { return false; } }) : (page.sessions ?? []).filter((session: any) => isSessionAllowed(session, grants)) };
    });
  });
  julesTool("jules_get_session", "Recupera una sesión solo cuando su fuente y rama exactas están autorizadas.", {
    session_id: z.string().trim().min(1).max(256).describe("ID de sesión o nombre completo sessions/{id}; no URL"),
  }, async (args: any) => {
    const denied = requireScope("jules:read"); if (denied) return denied;
    return safeJulesResult("jules_get_session", () => requireSessionAccess(args.session_id, "read"));
  });
  julesTool("jules_list_activities", "Lee actividades solo después de verificar ACL de lectura de fuente y rama.", {
    session_id: z.string().trim().min(1).max(256).describe("ID de sesión o nombre completo sessions/{id}; no URL"),
    page_size: z.number().int().min(1).max(100).optional().describe("Número de actividades (1-100; predeterminado 50)"),
    page_token: z.string().max(4096).optional().describe("Token nextPageToken de la página anterior"),
  }, async (args: any) => {
    const denied = requireScope("jules:read"); if (denied) return denied;
    return safeJulesResult("jules_list_activities", async () => {
      await requireSessionAccess(args.session_id, "read");
      const page = await julesListActivitiesPage(args.session_id, args.page_size ?? 50, args.page_token);
      const activities = (page.activities ?? []).map((activity: any) => {
        const plan = activity?.planGenerated?.plan;
        return plan ? { ...activity, planGenerated: { ...activity.planGenerated, plan_sha256: planSha256(plan) } } : activity;
      });
      return { ...page, activities };
    });
  });
  julesTool("jules_create_session", "Crea una sesión solo para fuente y rama existentes y autorizadas; fuerza aprobación del plan y AUTO_CREATE_PR.", {
    source: z.string().trim().min(1).max(512).refine((v) => { try { normalizeSourceName(v); return true; } catch { return false; } }, { message: "La fuente debe ser un recurso Jules válido." }).describe("Nombre literal sources/... devuelto por Jules"),
    starting_branch: z.string().trim().min(1).max(255).describe("Rama exacta devuelta por sources.get y autorizada para este sujeto"),
    prompt: z.string().trim().min(1).max(10000).describe("Prompt completo con alcance, restricciones, aceptación, pruebas y cláusula NO SIMULACIÓN"),
    title: z.string().trim().min(1).max(200).optional().describe("Título breve de la sesión"),
  }, async (args: any) => {
    const denied = requireScope("jules:write"); if (denied) return denied;
    return safeJulesResult("jules_create_session", async () => {
      const sourceName = normalizeSourceName(args.source);
      await requireJulesSourceGrant(actor, sourceName, args.starting_branch, "write");
      const source = await julesGetSource(sourceName);
      if (source.name !== sourceName || !source.githubRepo) throw new McpDiagnosticError("JULES_SOURCE_NOT_AVAILABLE");
      const branches = [...(Array.isArray(source.githubRepo.branches) ? source.githubRepo.branches : []), ...(source.githubRepo.defaultBranch ? [source.githubRepo.defaultBranch] : [])];
      if (!branches.some((b: any) => b?.displayName === args.starting_branch)) throw new McpDiagnosticError("JULES_BRANCH_NOT_FOUND");
      return julesCreateSession({ prompt: args.prompt, sourceContext: { source: sourceName, githubRepoContext: { startingBranch: args.starting_branch } }, automationMode: "AUTO_CREATE_PR", requirePlanApproval: true, ...(args.title ? { title: args.title } : {}) });
    });
  });
  julesTool("jules_send_message", "Envía seguimiento a sesión autorizada en la misma fuente y rama; escritura ambigua no se reintenta.", {
    session_id: z.string().trim().min(1).max(256).describe("ID de sesión o nombre completo sessions/{id}; no URL"),
    prompt: z.string().trim().min(1).max(10000).describe("Respuesta o mensaje de seguimiento para Jules"),
  }, async (args: any) => {
    const denied = requireScope("jules:write"); if (denied) return denied;
    return safeJulesResult("jules_send_message", async () => {
      const session = await requireSessionAccess(args.session_id, "write");
      if (!["AWAITING_USER_FEEDBACK", "IN_PROGRESS", "PAUSED"].includes(session.state)) throw new McpDiagnosticError("JULES_SESSION_NOT_READY_FOR_MESSAGE");
      await julesSendMessage(args.session_id, args.prompt);
      return { accepted: true, session_id: session.name, state_before_send: session.state, note: "El envío fue aceptado; consulta actividades posteriores para comprobar la respuesta." };
    });
  });
  julesTool("jules_approve_plan", "Aprueba únicamente el plan cuyo plan_id y SHA-256 se recibieron en las actividades y siguen vigentes. La herramienta relee estado y plan dos veces; el proveedor no expone un precondicionamiento atómico por plan, por lo que puede persistir una ventana de carrera remota.", {
    session_id: z.string().trim().min(1).max(256).describe("ID de sesión o nombre completo sessions/{id}; no URL"),
    plan_id: z.string().trim().min(1).max(256).describe("ID exacto del último planGenerated.plan.id mostrado en jules_list_activities"),
    plan_sha256: z.string().regex(/^[0-9a-f]{64}$/).describe("SHA-256 exacto planGenerated.plan_sha256 devuelto por jules_list_activities; confirma el contenido revisado"),
  }, async (args: any) => {
    const denied = requireScope("jules:write"); if (denied) return denied;
    return safeJulesResult("jules_approve_plan", async () => {
      const firstSession = await requireSessionAccess(args.session_id, "write");
      if (firstSession.state !== "AWAITING_PLAN_APPROVAL") throw new McpDiagnosticError("JULES_PLAN_NOT_AWAITING_APPROVAL");
      const firstPlan = await readCurrentPlan(args.session_id);
      if (firstPlan.plan_id !== args.plan_id || firstPlan.plan_sha256 !== args.plan_sha256) throw new McpDiagnosticError("JULES_PLAN_CHANGED");
      const secondSession = await requireSessionAccess(args.session_id, "write");
      if (secondSession.state !== "AWAITING_PLAN_APPROVAL") throw new McpDiagnosticError("JULES_PLAN_NOT_AWAITING_APPROVAL");
      const secondPlan = await readCurrentPlan(args.session_id);
      if (secondPlan.plan_id !== firstPlan.plan_id || secondPlan.plan_sha256 !== firstPlan.plan_sha256) throw new McpDiagnosticError("JULES_PLAN_CHANGED");
      await julesApprovePlan(args.session_id);
      return { accepted: true, session_id: secondSession.name, plan_id: secondPlan.plan_id, plan_sha256: secondPlan.plan_sha256, preflight_reads: 2, note: "El proveedor aceptó approvePlan sobre el plan que coincidió en dos lecturas previas. La API de Jules no acepta un plan_id/etag condicional; existe una ventana de carrera remota entre la última lectura y el POST. Reconsulta las actividades y verifica planApproved.planId." };
    });
  });
// Herramienta 1: khora_resumen
  gatedTool(
    "khora_resumen",
    "Conteo por estado, caracteres y rango de fechas.",
    {
      fecha_inicio: z.string().optional().describe("Fecha inicio filtro ISO (YYYY-MM-DD)"),
      fecha_fin: z.string().optional().describe("Fecha fin filtro ISO (YYYY-MM-DD)"),
      estado: z.string().optional().describe("Estado del volcado"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraResumen(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 2: khora_listar_volcados
  gatedTool(
    "khora_listar_volcados",
    "Índice con metadatos y extracto. Filtros por estado, fechas u orden.",
    {
      estado: z.string().optional().describe("Filtrar por estado"),
      fecha_inicio: z.string().optional().describe("Filtrar por fecha inicio"),
      fecha_fin: z.string().optional().describe("Filtrar por fecha fin"),
      orden: z.enum(["ASC", "DESC"]).optional().describe("Orden cronológico (ASC o DESC)"),
      limite: z.number().optional().describe("Límite de resultados (max 100)"),
      offset: z.number().optional().describe("Paginación"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraListarVolcados(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 3: khora_leer_volcado
  gatedTool(
    "khora_leer_volcado",
    "Verbatim íntegro por id (folio o UUID), o versión histórica concreta.",
    {
      id: z.string().describe("Folio numérico o UUID único del volcado"),
      version: z.number().optional().describe("Versión histórica concreta a consultar"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraLeerVolcado(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 4: khora_buscar_volcados
  gatedTool(
    "khora_buscar_volcados",
    "Búsqueda de frase con fragmentos de contexto y plegado de acentos.",
    {
      busqueda: z.string().describe("Frase o texto a buscar"),
      limite: z.number().optional().describe("Límite de resultados"),
      offset: z.number().optional().describe("Paginación"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraBuscarVolcados(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 5: khora_versiones_volcado
  gatedTool(
    "khora_versiones_volcado",
    "Historial de correcciones, sha256 y versión aprobada.",
    {
      volcado_id: z.string().describe("Folio numérico o UUID del volcado"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraVersionesVolcado(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  gatedTool("khora_listar_audios", "Índice paginado de audio original y MP3, incluidas capturas aún abiertas. Solo del propietario autenticado.", {
    limite:z.number().int().min(1).max(100).optional(),offset:z.number().int().nonnegative().optional(),
  },async(args:any)=>{const denied=requireScope("volcados:read");if(denied)return denied;return {content:[{type:"text",text:JSON.stringify(await toolKhoraListarAudios(actor,args))}]};});
  gatedTool("khora_leer_audio", "Obtiene bytes auténticos verificados de un original o MP3 en bloques Base64. No crea audio ni altera datos. Continuar con siguiente_offset y sha256_esperado fijado al sha256 recibido hasta null. Una captura abierta devuelve un prefijo identificado, no una grabación completa.", {
    id:z.string().describe("Sesión, UUID de volcado o folio"),formato:z.enum(["original","mp3"]).optional(),parte:z.number().int().positive().optional(),offset_bytes:z.number().int().nonnegative().optional(),limite_bytes:z.number().int().min(1).max(262144).optional(),sha256_esperado:z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  },async(args:any)=>{const denied=requireScope("volcados:read");if(denied)return denied;return {content:[{type:"text",text:JSON.stringify(await toolKhoraLeerAudio(actor,args))}]};});

  // Herramienta 6: khora_ui_review
  gatedTool(
    "khora_ui_review",
    "Devuelve la interfaz de Khora renderizada en HTML con el corpus real del operador. " +
      "Permite ver la UI que producen los volcados: densidad de la bandeja, títulos largos, " +
      "lectura de dictados extensos, incidentes. Solo lectura; los controles no responden. " +
      "Sin argumentos devuelve el inventario de pantallas y la forma del corpus.",
    {
      pantalla: z
        .enum(["ingreso", "archivo", "revision", "aprobacion", "ingesta", "registro", "grafo"])
        .optional()
        .describe("Pantalla a renderizar. Omitir para recibir el inventario."),
      volcado: z.string().optional().describe("Folio o UUID del volcado que se muestra abierto"),
      solo_metadatos: z.boolean().optional().describe("Devolver solo el inventario, sin HTML"),
    },
    async (args: any) => {
      const denied = requireScope("volcados:read");
      if (denied) return denied;
      const res = await toolKhoraUiReview(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 9: observación instantánea unificada
  gatedTool(
    "khora_observacion_instantanea",
    "Vista unificada del estado semántico actual del navegador, actividad persistida, último evento, fallos recientes y cursor de eventos. Solo lectura.",
    {
      session_id: z.string().optional().describe("Limitar la observación a una sesión concreta"),
    },
    async (args: any) => {
      const denied = requireScope("runtime:read");
      if (denied) return denied;
      const res = await toolKhoraObservacionInstantanea(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 10: eventos desde cursor
  gatedTool(
    "khora_eventos_desde",
    "Devuelve únicamente los eventos posteriores a un cursor monotónico global. Permite mantener una visión incremental del runtime sin releer el historial.",
    {
      cursor: z.number().int().nonnegative().optional().describe("ID de evento ya observado; usar 0 para comenzar"),
      limite: z.number().int().min(1).max(200).optional().describe("Máximo de eventos a devolver"),
      session_id: z.string().optional().describe("Filtrar por sesión"),
    },
    async (args: any) => {
      const denied = requireScope("runtime:read");
      if (denied) return denied;
      const res = await toolKhoraEventosDesde(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 7: estado vivo de runtime
  gatedTool(
    "khora_estado_vivo",
    "Estado operativo actual de Khora a partir del registro persistente de runtime. Devuelve actividad reciente, sesiones observadas, última observación y fallos recientes. Solo lectura.",
    {},
    async () => {
      const denied = requireScope("runtime:read");
      if (denied) return denied;
      const res = await toolKhoraEstadoVivo();
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

  // Herramienta 8: eventos recientes de runtime
  gatedTool(
    "khora_eventos_recientes",
    "Lee el flujo reciente de eventos de Khora con filtros por sesión, componente, severidad, resultado, fase, scope y categoría. Solo lectura.",
    {
      segundos: z.number().optional().describe("Ventana retrospectiva en segundos (1-86400, default 300)"),
      limite: z.number().optional().describe("Máximo de eventos (1-200, default 50)"),
      session_id: z.string().optional().describe("Filtrar por sesión"),
      component: z.string().optional().describe("Filtrar por componente"),
      severity: z.enum(["INFO","WARN","ERROR","CRITICAL"]).optional(),
      outcome: z.enum(["SUCCESS","FAILURE","PARTIAL","SKIPPED","PENDING"]).optional(),
      fase: z.string().optional().describe("Filtrar por fase persistida"),
      scope: z.string().optional().describe("Scope de ObservationBatch"),
      category: z.string().optional().describe("Categoría de ObservationBatch"),
    },
    async (args: any) => {
      const denied = requireScope("runtime:read");
      if (denied) return denied;
      const res = await toolKhoraEventosRecientes(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );


  // Health-check discreto del MCP canónico: autenticación, scopes y SI vigente.
  gatedTool(
    "khora_mcp_health",
    "Comprobación discreta de acceso completo al MCP de KHORA. No ejecuta trabajo sustantivo.",
    {
      thinking_mode: NORM_THINKING_MODE,
      output_format_version: NORM_OUTPUT_FORMAT_VERSION,
    },
    async (args: any) => {
      assertNormativeRuntimeContext({
        platform: REQUIRED_PLATFORM,
        reasoning_mode: args.thinking_mode,
        output_format_version: args.output_format_version,
      });
      const requiredScopes = ["volcados:read", "runtime:read", "norm:turn"];
      const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));
      try {
        const snapshot = await getCurrentSiSnapshot();
        const methodologySnapshot = await getCurrentMethodologySnapshot();
        const verifier = getCurrentVerifierInfo();
        const fullAccess = missingScopes.length === 0;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: fullAccess && Boolean(snapshot.version && snapshot.gitCommitSha && snapshot.gitBlobSha),
              status: fullAccess ? "OK" : "DEGRADED",
              full_access: fullAccess,
              missing_scopes: missingScopes,
              protocol: verifier.protocol,
              protocol_version: verifier.protocol_version,
              verifier_version: verifier.verifier_version,
              si_version: snapshot.version,
              si_version_name: snapshot.versionName,
              si_last_updated_at: snapshot.canonicalUpdatedAt,
              si_sha256: snapshot.sha256,
              manifest_sha256: snapshot.manifestSha256,
              methodology_version: methodologySnapshot.version,
              methodology_version_name: methodologySnapshot.versionName,
              methodology_last_updated_at: methodologySnapshot.canonicalUpdatedAt,
              tools_contract: "SINGLE_MCP"
            })
          }]
        };
      } catch (error) {
        return {
          _meta: { "khora/diagnostic": diagnose(error, { operation: "khora_mcp_health", correlation_id }) },
          isError: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              status: "UNAVAILABLE",
              full_access: false,
              missing_scopes: missingScopes,
              reason: diagnose(error, { operation: "khora_mcp_health", correlation_id }).code,
              diagnostic: diagnose(error, { operation: "khora_mcp_health", correlation_id })
            })
          }]
        };
      }
    }
  );

  // Gobernanza normativa: misma puerta MCP, capacidad separada por scope.
  gatedTool(
    "khora_norm_open_turn",
    "Abre el ciclo normativo del turno y fija el snapshot exacto del SI. Usa norm:turn.",
    {
      conversation_id: z.string().optional().describe("Identificador externo de conversación, si la plataforma lo proporciona"),
      turn_number: z.number().int().positive().optional().describe("Número de turno, si la plataforma lo proporciona"),
      thinking_mode: NORM_THINKING_MODE,
      output_format_version: NORM_OUTPUT_FORMAT_VERSION,
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await openNormativeTurn(actor, {
          conversation_id: args.conversation_id,
          turn_number: args.turn_number,
          runtime: {
            platform: REQUIRED_PLATFORM,
            reasoning_mode: args.thinking_mode,
            output_format_version: args.output_format_version,
          },
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      } catch (error) {
        return diagnosticFailure(error, { operation: "khora_norm_open_turn", correlation_id });
      }
    }
  );

  gatedTool(
    "khora_norm_apply_principle",
    "Registra server-side la aplicación del siguiente principio del snapshot. KHORA impone el orden canónico y no permite saltos o reordenamientos.",
    {
      turn_token: z.string().min(16).describe("Token opaco emitido por khora_norm_open_turn"),
      folio: z.string().regex(/^P\d{3}$/).describe("Folio del siguiente principio esperado por KHORA"),
      status: z.enum(["A", "N", "C"]).describe("A=APLICADO, N=NO_APLICABLE, C=CONFLICTO_RESUELTO"),
      anchor: z.string().min(1).max(64).optional().describe("Obligatorio para A/C"),
      reason_code: z.string().min(1).max(32).optional().describe("Obligatorio para N"),
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await applyNormativePrinciple(actor, {
          turn_token: args.turn_token,
          folio: args.folio,
          status: args.status,
          anchor: args.anchor,
          reason_code: args.reason_code,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      } catch (error) {
        return diagnosticFailure(error, { operation: "khora_norm_apply_principle", correlation_id });
      }
    }
  );

  gatedTool(
    "khora_norm_verify_turn",
    "Verifica y registra el receipt del turno. Solo cierra el ciclo cuando KHORA devuelve VERIFIED. Usa norm:turn.",
    {
      turn_token: z.string().min(16).describe("Token opaco emitido por khora_norm_open_turn"),
      receipt: normativeReceiptSchema,
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await verifyNormativeTurn(actor, {
          turn_token: args.turn_token,
          receipt: args.receipt,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      } catch (error) {
        return diagnosticFailure(error, { operation: "khora_norm_verify_turn", correlation_id });
      }
    }
  );

  gatedTool(
    "khora_norm_release_turn",
    "Emite una autorización de liberación solo para un turno ya VERIFIED.",
    {
      turn_token: z.string().min(16).describe("Token del ciclo emitido por khora_norm_open_turn"),
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await releaseNormativeTurn(actor, { turn_token: args.turn_token });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      } catch (error) {
        return diagnosticFailure(error, { operation: "khora_norm_release_turn", correlation_id });
      }
    }
  );

  // Publish schemas derived from the exact shapes registered above.
  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolsList.filter((tool) => {
      const requiredScopes = tool.securitySchemes.flatMap((scheme) => scheme.scopes ?? []);
      const properties = (tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
      const requiresNormativeTurn = Object.hasOwn(properties, "_norm_turn_token");
      return requiredScopes.every((scope) => scopes.includes(scope)) &&
        (!requiresNormativeTurn || scopes.includes("norm:turn"));
    }),
  }));

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await mcpServer.connect(transport);

  return transport.handleRequest(req);
}

export const GET = withHttpDiagnostics("mcp.GET", handleMcpRequest, registrarEventoServicio);
export const POST = withHttpDiagnostics("mcp.POST", handleMcpRequest, registrarEventoServicio);
