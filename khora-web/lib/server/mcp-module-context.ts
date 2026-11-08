import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describeMcpTool, type McpToolScope } from "@/lib/server/mcp-tool-contract";

/**
 * Shared host context supplied to every functional MCP module.
 * The registry transports this context; authorization remains enforced by
 * the host and the central MCP_TOOL_SCOPES contract.
 */
export type McpModuleContext = {
  mcpServer: McpServer;
  toolsList: ReturnType<typeof describeMcpTool>[];
  actor: string;
  correlation_id: string;
  requireScope: (scope: McpToolScope) => unknown | null;
};

