import { createHash } from "node:crypto";
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
import { McpDiagnosticError, diagnosticFailure } from "@/lib/server/mcp-diagnostics";
import { isJulesDeveloperSubject, listJulesSourceGrants, requireJulesSourceGrant, type JulesAccessMode, type JulesSourceGrant } from "@/lib/server/jules-access";
import { describeMcpTool, type McpToolName } from "@/lib/server/mcp-tool-contract";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type JulesMcpModuleContext = {
  mcpServer: McpServer;
  toolsList: ReturnType<typeof describeMcpTool>[];
  actor: string;
  correlation_id: string;
  requireScope: (scope: "jules:read" | "jules:write") => any | null;
};

/**
 * Módulo funcional Jules del servidor MCP de Khora.
 * Se registra dentro del endpoint único /api/mcp y hereda sus controles
 * de autenticación, auditoría y catálogo; mantiene sus scopes especializados.
 */
export function registerJulesMcpModule({
  mcpServer,
  toolsList,
  actor,
  correlation_id,
  requireScope,
}: JulesMcpModuleContext) {
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
  julesTool("jules_create_session", "Crea una sesión en la fuente y rama solicitadas; el propietario desarrollador no requiere aprobación manual del plan. Jules prepara una PR automáticamente.", {
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
      const developerOwner = isJulesDeveloperSubject(actor);
      return julesCreateSession({ prompt: args.prompt, sourceContext: { source: sourceName, githubRepoContext: { startingBranch: args.starting_branch } }, automationMode: "AUTO_CREATE_PR", requirePlanApproval: !developerOwner, ...(args.title ? { title: args.title } : {}) });
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

}
