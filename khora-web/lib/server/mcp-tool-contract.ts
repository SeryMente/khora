import { z } from "zod";

// Preserve the existing per-tool OAuth metadata. Effective dependencies are
// documented separately: substantive tools also need a norm:turn cycle.
export const MCP_TOOL_SCOPES = {
  khora_blog_cambios: ["blog:read"],
  khora_blog_estado: ["blog:read"],
  khora_listar_audios: ["volcados:read"],
  khora_leer_audio: ["volcados:read"],
  khora_resumen: ["volcados:read"],
  khora_listar_volcados: ["volcados:read"],
  khora_leer_volcado: ["volcados:read"],
  khora_buscar_volcados: ["volcados:read"],
  khora_versiones_volcado: ["volcados:read"],
  khora_ui_review: ["volcados:read"],
  khora_observacion_instantanea: ["runtime:read"],
  khora_eventos_desde: ["runtime:read"],
  khora_estado_vivo: ["runtime:read"],
  khora_eventos_recientes: ["runtime:read"],
  khora_mcp_health: ["volcados:read", "runtime:read", "norm:turn"],
  khora_norm_open_turn: ["norm:turn"],
  khora_norm_apply_principle: ["norm:turn"],
  khora_norm_verify_turn: ["norm:turn"],
  khora_norm_release_turn: ["norm:turn"],
} as const;

export type McpToolName = keyof typeof MCP_TOOL_SCOPES;

export function describeMcpTool(
  name: McpToolName,
  description: string,
  shape: z.ZodRawShape,
) {
  const schema = z.toJSONSchema(z.object(shape), { target: "draft-7", io: "input" });
  // Keep the historical published top-level unknown-key policy. SDK input
  // parsing still strips unknown top-level keys; receipt extras are preserved.
  const { $schema: _dialect, ...inputSchema } = schema;
  return {
    name,
    description,
    inputSchema: { ...inputSchema, type: "object" as const, additionalProperties: false },
    securitySchemes: [{ type: "oauth2" as const, scopes: [...MCP_TOOL_SCOPES[name]] }],
  };
}
