// @l0 L0-002 §4 · @req MCP-ROUTE-01/REQ-1
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";
import { verifyJwt } from "@/lib/server/jwt";
import { obtenerGeneracionRevocacion } from "@/lib/server/oauth";
import { isProductionEnv } from "@/lib/server/mcp-db";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  toolKhoraResumen,
  toolKhoraListarVolcados,
  toolKhoraLeerVolcado,
  toolKhoraBuscarVolcados,
  toolKhoraVersionesVolcado,
} from "@/lib/server/mcp-tools";
import { toolKhoraUiReview } from "@/lib/server/mcp-ui-review";

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
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}", scope="volcados:read"`,
      },
    }
  );
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
  if (!scopes.includes("volcados:read")) {
    return makeUnauthorizedResponse(config);
  }

  // Verificar revocación de generación
  const currentGen = await obtenerGeneracionRevocacion(payload.sub);
  if (typeof payload.gen !== "number" || payload.gen !== currentGen) {
    return makeUnauthorizedResponse(config);
  }

  // Instanciar servidor MCP en modo sin estado
  const mcpServer = new McpServer({
    name: "khora-mcp-volcados",
    version: "1.0.0",
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
      const res = await toolKhoraUiReview(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }
  );

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
