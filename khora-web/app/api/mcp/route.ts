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
import { openNormativeTurn, verifyNormativeTurn } from "@/lib/server/mcp-normative";

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

  // Verificar scope ("volcados:read")
  const scopes = (payload.scope || "").split(/\s+/).filter(Boolean);
  if (!scopes.includes("volcados:read") && !scopes.includes("runtime:read") && !scopes.includes("norm:turn")) {
    return makeUnauthorizedResponse(config);
  }

  const requireScope = (scope: "volcados:read" | "runtime:read" | "norm:turn") =>
    scopes.includes(scope)
      ? null
      : scopeFailure(config, scope);

  // Verificar revocación de generación
  const currentGen = await obtenerGeneracionRevocacion(payload.sub);
  if (typeof payload.gen !== "number" || payload.gen !== currentGen) {
    return makeUnauthorizedResponse(config);
  }

  // Instanciar servidor MCP en modo sin estado
  const mcpServer = new McpServer({
    name: "khora-mcp",
    version: "1.2.0",
  });

  // Herramienta 1: khora_resumen
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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
  mcpServer.tool(
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


  // Gobernanza normativa: misma puerta MCP, capacidad separada por scope.
  mcpServer.tool(
    "khora_norm_open_turn",
    "Abre el ciclo normativo del turno y fija el snapshot exacto del SI. Usa norm:turn.",
    {
      conversation_id: z.string().optional().describe("Identificador externo de conversación, si la plataforma lo proporciona"),
      turn_number: z.number().int().positive().optional().describe("Número de turno, si la plataforma lo proporciona"),
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await openNormativeTurn(payload.sub, args);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : "TURN_OPEN_FAILED" }],
        };
      }
    }
  );

  mcpServer.tool(
    "khora_norm_verify_turn",
    "Verifica y registra el receipt del turno. Solo cierra el ciclo cuando KHORA devuelve VERIFIED. Usa norm:turn.",
    {
      turn_token: z.string().min(16).describe("Token opaco emitido por khora_norm_open_turn"),
      receipt: z.object({}).passthrough().describe("Cycle Receipt NORM-CHECK v0.2.0"),
    },
    async (args: any) => {
      const denied = requireScope("norm:turn");
      if (denied) return denied;
      try {
        const res = await verifyNormativeTurn(payload.sub, {
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

  // SDK 1.x no publica securitySchemes en el nivel raíz de tools/list.
  // Publicamos una lista tipada explícita para que ChatGPT pueda detectar OAuth
  // por herramienta, manteniendo las mismas herramientas y esquemas de entrada.
  const toolsList = [
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
        },
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
  ] as any;

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
