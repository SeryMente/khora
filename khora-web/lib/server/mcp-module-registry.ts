import type { McpModuleContext } from "./mcp-module-context";
import { registerJulesMcpModule } from "./mcp-jules";

export type McpModuleRegistration = {
  id: string;
  register: (context: McpModuleContext) => void;
};

/**
 * Registro de módulos funcionales del servidor MCP de Khora.
 * Cada módulo se registra dentro del host /api/mcp compartido; no crea
 * endpoints, transports, OAuth servers ni controles de responsabilidad propios.
 * El registro no define permisos: cada módulo consume el contexto del host
 * y MCP_TOOL_SCOPES sigue siendo el contrato ejecutable de autorización.
 */
export const MCP_MODULE_REGISTRY: readonly McpModuleRegistration[] = [
  {
    id: "jules",
    register: registerJulesMcpModule,
  },
];

export function registerMcpModules(context: McpModuleContext): void {
  for (const module of MCP_MODULE_REGISTRY) {
    module.register(context);
  }
}
