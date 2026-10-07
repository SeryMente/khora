// @l0 L0-002 §4 · @req MCP-ROUTE-01/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";
import { verifyJwt } from "@/lib/server/jwt";
import { obtenerGeneracionRevocacion } from "@/lib/server/oauth";
import { isProductionEnv } from "@/lib/server/mcp-db";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  toolKhoraResumen,
  toolKhoraListarVolcados,
  toolKhoraLeerVolcado,
  toolKhoraBuscarVolcados,
  toolKhoraVersionesVolcado,
} from "@/lib/server/mcp-tools";
import { toolKhoraUiReview } from "@/lib/server/mcp-ui-review";
import { toolKhoraEstadoVivo, toolKhoraEventosRecientes, toolKhoraObservacionInstantanea, toolKhoraEventosDesde } from "@/lib/server/mcp-observability";
import { assertNormativeTurnOpen, openNormativeTurn, verifyNormativeTurn, releaseNormativeTurn } from "@/lib/server/mcp-normative";
import { authenticateManualMcpToken, MANUAL_MCP_TOKEN_PREFIX } from "@/lib/server/mcp-manual-token";
import { registrarEventoServicio } from "@/lib/server/service-observability";
import { getCurrentSiSnapshot, getCurrentVerifierInfo } from "@/lib/server/norm-check";
import { assertNormativeRuntimeContext, REASONING_MODES, REQUIRED_OUTPUT_FORMAT_VERSION, REQUIRED_PLATFORM, type ReasoningMode } from "@/lib/server/normative-runtime";

export const runtime = "nodejs";

function makeUnauthorizedResponse(config: ReturnType<typeof getMcpConfig>) {
  const metadataUrl = config
    ? `${config.issuer}/.well-known/oauth-protected-resource`
    : "";
  return new NextResponse(
    JSON.stringify({ error: "unauthorized", error_description: "Valid Bearer token required" }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}", scope="runtime:read"`,
      },
    }
  );
}

function scopeFailure(config: ReturnType<typeof getMcpConfig>, requiredScope: string) {
  const metadataUrl = config
    ? `${config.issuer}/.well-known/oauth-protected-resource`
    : "";
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `Permiso insuficiente. Se requiere ${requiredScope}.` }],
    _meta: {
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
const NORM_OUTPUT_FORMAT_VERSION = z.literal(REQUIRED_OUTPUT_FORMAT_VERSION).describe(
  "Contrato obligatorio de salida visible por ciclo."
);

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
) {
  if (typeof turnToken !== "string") {
    return {
      isError: true as const,
      content: [{
        type: "text" as const,
        text: "NORMATIVE_TURN_REQUIRED: primero llama a khora_norm_open_turn y usa el turn_token devuelto.",
      }],
    };
  }
  try {
    assertNormativeRuntimeContext({
      platform: REQUIRED_PLATFORM,
      reasoning_mode: thinkingMode,
      output_format_version: outputFormatVersion,
    });
    await assertNormativeTurnOpen(actor, turnToken, {
      platform: REQUIRED_PLATFORM,
      reasoning_mode: thinkingMode as ReasoningMode,
      output_format_version: outputFormatVersion,
    });
    return null;
  } catch (error) {
    return {
      isError: true as const,
      content: [{
        type: "text" as const,
        text: error instanceof Error
          ? `NORMATIVE_TURN_REQUIRED: ${error.message}. Debes abrir/reabrir el ciclo con khora_norm_open_turn antes de continuar.`
          : "NORMATIVE_TURN_REQUIRED",
      }],
    };
  }
}

async function handleMcpRequest(req: NextRequest) {
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
    return makeUnauthorizedResponse(config);
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
      return makeUnauthorizedResponse(config);
    }
    actor = manualToken.usuario;
    scopes = manualToken.scope.split(/\s+/).filter(Boolean);
    tokenGeneration = manualToken.generacion;
  } else {
    const payload = verifyJwt(token, config.jwtSecret);
    if (!payload) {
      return makeUnauthorizedResponse(config);
    }

    // Verificar issuer (iss)
    if (payload.iss !== config.issuer) {
      return makeUnauthorizedResponse(config);
    }

    // Verificar audiencia (aud)
    if (payload.aud !== config.canonicalUrl) {
      return makeUnauthorizedResponse(config);
    }

    scopes = (payload.scope || "").split(/\s+/).filter(Boolean);
    actor = payload.sub;
    tokenGeneration = payload.gen;
  }

  // El Bearer puede ser OAuth (JWT) o un token manual opaco gestionado por KHORA.
  if (
    !actor ||
    !Number.isSafeInteger(tokenGeneration) ||
    (!scopes.includes("volcados:read") && !scopes.includes("runtime:read") && !scopes.includes("norm:turn"))
  ) {
    return makeUnauthorizedResponse(config);
  }

  const requireScope = (scope: "volcados:read" | "runtime:read" | "norm:turn") =>
    scopes.includes(scope)
      ? null
      : scopeFailure(config, scope);

  // Verificar revocación de generación para ambos tipos de Bearer.
  const currentGen = await obtenerGeneracionRevocacion(actor);
  if (tokenGeneration !== currentGen) {
    return makeUnauthorizedResponse(config);
  }

  // Instanciar servidor MCP en modo sin estado
  const mcpServer = new McpServer(
    {
      name: "khora-mcp",
      version: "1.3.0",
    },
    {
      instructions:
        "ADAPTIVE NORMATIVE GATE: durante Thinking, cuando este disponible, intenta HEALTH MCP -> OPEN TURN -> aplicar todos los principios del snapshot -> VERIFY -> RELEASE antes de emitir la salida. " +
        "La salida visible de cada turno debe cumplir el contrato v1.7.1 cualquiera que sea el escenario. " +
        "Si KHORA no esta disponible o no puede verificarse, continua la respuesta sin inventar verificacion y declara K: OFF. " +
        "Si KHORA devuelve VERIFIED_RELEASE, declara K: ✓. Si devuelve un fallo normativo, declara K: ! o K: ? segun corresponda. " +
        "El modo de razonamiento es metadato operativo y no debe presentarse como prueba del pensamiento interno.",
    },
  );

  const gatedTool = (
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: (args: any) => Promise<any>,
  ) => {
    const observedHandler = async (args: any, requireTurn: boolean) => {
      const startedAt = Date.now();
      try {
        if (requireTurn) {
          const normativeDenied = await requireNormativeTurn(actor, args._norm_turn_token, args._thinking_mode, args._output_format_version);
          if (normativeDenied) {
            await registrarEventoServicio({
              service: "mcp",
              operation: "tool." + name,
              route: "/api/mcp",
              method: "MCP",
              outcome: "FAILURE",
              severity: "WARN",
              reasonCode: "NORMATIVE_TURN_REQUIRED",
              durationMs: Date.now() - startedAt,
              metadata: { tool: name },
            });
            return normativeDenied;
          }
        }

        const result = await handler(requireTurn ? withoutNormTurn(args) : args);
        const failed = result?.isError === true;
        await registrarEventoServicio({
          service: "mcp",
          operation: "tool." + name,
          route: "/api/mcp",
          method: "MCP",
          outcome: failed ? "FAILURE" : "SUCCESS",
          severity: failed ? "WARN" : "INFO",
          durationMs: Date.now() - startedAt,
          metadata: { tool: name },
        });
        return result;
      } catch (error) {
        await registrarEventoServicio({
          service: "mcp",
          operation: "tool." + name,
          route: "/api/mcp",
          method: "MCP",
          outcome: "FAILURE",
          severity: "ERROR",
          durationMs: Date.now() - startedAt,
          reasonCode: error instanceof Error ? error.name.slice(0, 64) : "TOOL_ERROR",
          metadata: { tool: name, error_type: error instanceof Error ? error.name : "unknown" },
        });
        throw error;
      }
    };

    if (name === "khora_mcp_health" || name === "khora_norm_open_turn" || name === "khora_norm_verify_turn" || name === "khora_norm_release_turn") {
      return mcpServer.tool(name, description, inputSchema, async (args: any) => observedHandler(args, false));
    }

    return mcpServer.tool(
      name,
      description,
      withNormTurn(inputSchema as z.ZodRawShape),
      async (args: any) => observedHandler(args, true),
    );
  };

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
        const verifier = getCurrentVerifierInfo();
        const fullAccess = missingScopes.length === 0;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: fullAccess && Boolean(snapshot.version && snapshot.gitBlobSha),
              status: fullAccess ? "OK" : "DEGRADED",
              full_access: fullAccess,
              missing_scopes: missingScopes,
              protocol: verifier.protocol,
              protocol_version: verifier.protocol_version,
              verifier_version: verifier.verifier_version,
              si_version: snapshot.version,
              si_sha256: snapshot.sha256,
              manifest_sha256: snapshot.manifestSha256,
              tools_contract: "SINGLE_MCP"
            })
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              status: "UNAVAILABLE",
              full_access: false,
              missing_scopes: missingScopes,
              reason: error instanceof Error ? error.message : "MCP_HEALTH_FAILED"
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
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : "TURN_OPEN_FAILED" }],
        };
      }
    }
  );

  gatedTool(
    "khora_norm_verify_turn",
    "Verifica y registra el receipt del turno. Solo cierra el ciclo cuando KHORA devuelve VERIFIED. Usa norm:turn.",
    {
      turn_token: z.string().min(16).describe("Token opaco emitido por khora_norm_open_turn"),
      receipt: z.object({}).passthrough().describe("Cycle Receipt NORM-CHECK v0.3.0"),
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
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : "TURN_VERIFY_FAILED" }],
        };
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
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : "TURN_RELEASE_FAILED" }],
        };
      }
    }
  );

  // SDK 1.x no publica securitySchemes en el nivel raíz de tools/list.
  // Publicamos una lista tipada explícita para que ChatGPT pueda detectar OAuth
  // por herramienta, manteniendo las mismas herramientas y esquemas de entrada.
  const toolsList = [
    {
      name: "khora_mcp_health",
      description: "Comprobación discreta de acceso completo al MCP de KHORA. No ejecuta trabajo sustantivo.",
      inputSchema: {
        type: "object",
        properties: {
          thinking_mode: { type: "string", enum: [...REASONING_MODES] },
          output_format_version: { type: "string", enum: ["v1.7.1"] },
        },
        required: ["thinking_mode", "output_format_version"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read", "runtime:read", "norm:turn"] }],
    },
    {
      name: "khora_resumen",
      description: "Conteo por estado, caracteres y rango de fechas.",
      inputSchema: {
        type: "object",
        properties: {
          fecha_inicio: { type: "string", description: "Fecha inicio filtro ISO (YYYY-MM-DD)" },
          fecha_fin: { type: "string", description: "Fecha fin filtro ISO (YYYY-MM-DD)" },
          estado: { type: "string", description: "Estado del volcado" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_listar_volcados",
      description: "Índice con metadatos y extracto. Filtros por estado, fechas u orden.",
      inputSchema: {
        type: "object",
        properties: {
          estado: { type: "string", description: "Filtrar por estado" },
          fecha_inicio: { type: "string", description: "Filtrar por fecha inicio" },
          fecha_fin: { type: "string", description: "Filtrar por fecha fin" },
          orden: { type: "string", enum: ["ASC", "DESC"], description: "Orden cronológico (ASC o DESC)" },
          limite: { type: "number", description: "Límite de resultados (max 100)" },
          offset: { type: "number", description: "Paginación" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_leer_volcado",
      description: "Verbatim íntegro por id (folio o UUID), o versión histórica concreta.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Folio numérico o UUID único del volcado" },
          version: { type: "number", description: "Versión histórica concreta a consultar" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_buscar_volcados",
      description: "Búsqueda de frase con fragmentos de contexto y plegado de acentos.",
      inputSchema: {
        type: "object",
        properties: {
          busqueda: { type: "string", description: "Frase o texto a buscar" },
          limite: { type: "number", description: "Límite de resultados" },
          offset: { type: "number", description: "Paginación" },
        },
        required: ["busqueda"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_versiones_volcado",
      description: "Historial de correcciones, sha256 y versión aprobada.",
      inputSchema: {
        type: "object",
        properties: {
          volcado_id: { type: "string", description: "Folio numérico o UUID del volcado" },
        },
        required: ["volcado_id"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_ui_review",
      description: "Devuelve la interfaz de Khora renderizada en HTML con el corpus real del operador. Solo lectura.",
      inputSchema: {
        type: "object",
        properties: {
          pantalla: { type: "string", enum: ["ingreso", "archivo", "revision", "aprobacion", "ingesta", "registro", "grafo"] },
          volcado: { type: "string" },
          solo_metadatos: { type: "boolean" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["volcados:read"] }],
    },
    {
      name: "khora_observacion_instantanea",
      description: "Vista unificada del estado semántico actual del navegador, actividad persistida, último evento, fallos recientes y cursor de eventos. Solo lectura.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Limitar la observación a una sesión concreta" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["runtime:read"] }],
    },
    {
      name: "khora_eventos_desde",
      description: "Devuelve únicamente los eventos posteriores a un cursor monotónico global. Permite mantener una visión incremental del runtime sin releer el historial.",
      inputSchema: {
        type: "object",
        properties: {
          cursor: { type: "integer", minimum: 0, description: "ID de evento ya observado; usar 0 para comenzar" },
          limite: { type: "integer", minimum: 1, maximum: 200, description: "Máximo de eventos" },
          session_id: { type: "string", description: "Filtrar por sesión" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["runtime:read"] }],
    },
    {
      name: "khora_estado_vivo",
      description: "Estado operativo actual de Khora a partir del registro persistente de runtime. Devuelve actividad reciente, sesiones observadas, última observación y fallos recientes. Solo lectura.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["runtime:read"] }],
    },
    {
      name: "khora_eventos_recientes",
      description: "Lee el flujo reciente de eventos de Khora con filtros por sesión, componente, severidad, resultado, fase, scope y categoría. Solo lectura.",
      inputSchema: {
        type: "object",
        properties: {
          segundos: { type: "number", minimum: 1, maximum: 86400, description: "Ventana retrospectiva en segundos" },
          limite: { type: "number", minimum: 1, maximum: 200, description: "Máximo de eventos" },
          session_id: { type: "string" },
          component: { type: "string" },
          severity: { type: "string", enum: ["INFO", "WARN", "ERROR", "CRITICAL"] },
          outcome: { type: "string", enum: ["SUCCESS", "FAILURE", "PARTIAL", "SKIPPED", "PENDING"] },
          fase: { type: "string" },
          scope: { type: "string" },
          category: { type: "string" },
        },
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["runtime:read"] }],
    },

    {
      name: "khora_norm_open_turn",
      description: "Abre el ciclo normativo del turno y fija el snapshot exacto del SI.",
      inputSchema: {
        type: "object",
        properties: {
          conversation_id: { type: "string" },
          turn_number: { type: "integer", minimum: 1 },
          thinking_mode: { type: "string", enum: ["THINKING"] },
          output_format_version: { type: "string", enum: ["v1.7.1"] },
        },
        required: ["thinking_mode", "output_format_version"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["norm:turn"] }],
    },
    {
      name: "khora_norm_verify_turn",
      description: "Verifica y registra el receipt del turno; solo VERIFIED cierra el ciclo.",
      inputSchema: {
        type: "object",
        properties: {
          turn_token: { type: "string", minLength: 16 },
          receipt: { type: "object" },
        },
        required: ["turn_token", "receipt"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["norm:turn"] }],
    },
    {
      name: "khora_norm_release_turn",
      description: "Emite una autorización de liberación solo para un turno ya VERIFIED.",
      inputSchema: {
        type: "object",
        properties: {
          turn_token: { type: "string", minLength: 16, description: "Token del ciclo emitido por khora_norm_open_turn" },
        },
        required: ["turn_token"],
        additionalProperties: false,
      },
      securitySchemes: [{ type: "oauth2", scopes: ["norm:turn"] }],
    },
  ] as any;

  for (const tool of toolsList) {
    if (
      tool.name === "khora_mcp_health" ||
      tool.name === "khora_norm_open_turn" ||
      tool.name === "khora_norm_verify_turn" ||
      tool.name === "khora_norm_release_turn"
    ) continue;
    tool.inputSchema = tool.inputSchema || { type: "object", properties: {} };
    tool.inputSchema.properties = {
      ...(tool.inputSchema.properties || {}),
      _norm_turn_token: {
        type: "string",
        minLength: 16,
        description: "REQUERIDO: token del ciclo emitido por khora_norm_open_turn.",
      },
      _thinking_mode: {
        type: "string",
        enum: ["THINKING"],
        description: "REQUERIDO: ChatGPT debe estar en modo Thinking.",
      },
      _output_format_version: {
        type: "string",
        enum: ["v1.7.1"],
        description: "REQUERIDO: contrato de salida visible por ciclo.",
      },
    };
    tool.inputSchema.required = Array.from(new Set([
      ...(Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : []),
      "_norm_turn_token",
      "_thinking_mode",
      "_output_format_version",
    ]));
  }

  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolsList,
  }));

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await mcpServer.connect(transport);

  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function POST(req: NextRequest) {
  return handleMcpRequest(req);
}
