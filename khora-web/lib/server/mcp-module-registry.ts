import {
  registerJulesMcpModule,
  type JulesMcpModuleContext,
} from "./mcp-jules";

export type McpModuleRegistration = {
  id: string;
  register: (context: JulesMcpModuleContext) => void;
};

/**
 * Registro de módulos funcionales del servidor MCP de Khora.
 * Cada módulo se registra dentro del host /api/mcp compartido; no crea
 * endpoints, transports, OAuth servers ni controles de responsabilidad propios.
 */
export const MCP_MODULE_REGISTRY: readonly McpModuleRegistration[] = [
  {
    id: "jules",
    register: registerJulesMcpModule,
  },
];

export function registerMcpModules(context: JulesMcpModuleContext): void {
  for (const module of MCP_MODULE_REGISTRY) {
    module.register(context);
  }
}
