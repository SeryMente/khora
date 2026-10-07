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
import {
  assertNormativeRuntimeContext,
  REQUIRED_OUTPUT_FORMAT_VERSION,
  REQUIRED_PLATFORM,
  REQUIRED_REASONING_MODE,
} from "@/lib/server/normative-runtime";

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
const NORM_THINKING_MODE = z.literal(REQUIRED_REASONING_MODE).describe(
  "Obligatorio: ChatGPT debe estar ejecutando en modo Thinking. Si no puede verificarse, no se ejecuta."
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
      reasoning_mode: REQUIRED_REASONING_MODE,
      output_format_version: REQUIRED_OUTPUT_FORMAT_VERSION,
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
