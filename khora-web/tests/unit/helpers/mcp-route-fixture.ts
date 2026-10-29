import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as contracts from "../../../lib/server/mcp-tool-contract";
import * as receipt from "../../../lib/server/normative-receipt-schema";
import * as diagnostics from "../../../lib/server/mcp-diagnostics";
import * as boundary from "../../../lib/server/mcp-diagnostic-boundary";
import * as crypto from "node:crypto";
import * as runtime from "../../../lib/server/normative-runtime";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const source = fs.readFileSync(path.join(root, "app/api/mcp/route.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

// Execute the whole real route and SDK HTTP transport. Only external boundaries
// (Next response class, identity, storage and business services) are substituted.
// This is not proof of cryptography, OAuth, database effects or deployment.
export function routeFixture(options: { scopes?: string[]; revoked?: boolean; denyTurn?: boolean; production?: boolean; configured?: boolean; failService?: boolean; healthError?: boolean; partial?: boolean; auditFail?: boolean } = {}) {
  const schemas = new Map<contracts.McpToolName, { description: string; shape: z.ZodRawShape }>();
  const calls: Array<{ name: string; args: unknown }> = [];
  const servers: McpServer[] = [];
  class RecordingServer extends McpServer {
    constructor(...args: ConstructorParameters<typeof McpServer>) {
      super(...args); servers.push(this);
      const register = this.tool.bind(this);
      this.tool = ((...parameters: unknown[]) => {
        const [name, description, shape] = parameters;
        schemas.set(name as contracts.McpToolName, { description: description as string, shape: shape as z.ZodRawShape });
        return (register as Function)(...parameters);
      }) as typeof this.tool;
    }
  }
  const issuer = "https://khora-contract-fixture.invalid";
  const config = { issuer, canonicalUrl: issuer + "/api/mcp", jwtSecret: "synthetic-key-not-used-for-signing" };
  const scopes = options.scopes ?? ["volcados:read", "runtime:read", "norm:turn", "blog:read"];
  const business = (name: string) => async (args?: unknown) => {
    calls.push({ name, args });
    if (options.failService) throw new Error("synthetic-secret-private-payload");
    return options.partial ? { completo: false, resultados: [], cobertura: { examinados: 2, ilegibles: 1 } } : { fixture: name };
  };
  const modules: Record<string, unknown> = {
    "node:crypto": crypto,
    "@/lib/server/mcp-diagnostics": diagnostics,
    "@/lib/server/mcp-diagnostic-boundary": boundary,
    "next/server": { NextRequest: Request, NextResponse: Response },
    "zod": { z },
    "@modelcontextprotocol/sdk/server/mcp.js": { McpServer: RecordingServer },
    "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js": { WebStandardStreamableHTTPServerTransport },
    "@modelcontextprotocol/sdk/types.js": { ListToolsRequestSchema },
    "@/lib/server/mcp-tool-contract": contracts,
    "@/lib/server/normative-receipt-schema": receipt,
    "@/lib/server/normative-runtime": runtime,
    "@/lib/server/mcp-config": { getMcpConfig: () => options.configured === false ? null : config },
    "@/lib/server/jwt": { verifyJwtDetailed: (token: string) => token === "fixture-access" ? { ok: true, payload: { iss: issuer, aud: config.canonicalUrl, sub: "fixture-actor", gen: 1, scope: scopes.join(" ") } } : { ok: false, error: "invalid_format" } },
    "@/lib/server/oauth": { obtenerGeneracionRevocacion: async () => options.revoked ? 2 : 1 },
    "@/lib/server/mcp-db": { isProductionEnv: () => options.production === true },
    "@/lib/server/mcp-manual-token": { MANUAL_MCP_TOKEN_PREFIX: "fixture-manual-", authenticateManualMcpToken: async () => null },
    "@/lib/server/service-observability": { registrarEventoServicio: async () => { if (options.auditFail) throw Error("synthetic audit failure"); } },
    "@/lib/server/blog/mcp": {
      blogChanges: (actor: string, after?: string, limit?: number) => business("BlogChanges")({ actor, after, limit }),
      blogPublicStatus: (actor: string, publicationId: string) => business("BlogPublicStatus")({ actor, publicationId }),
    },
    "@/lib/server/mcp-audios": { toolKhoraListarAudios: (_actor:string,args:unknown)=>business("ListarAudios")(args), toolKhoraLeerAudio: (_actor:string,args:unknown)=>business("LeerAudio")(args) },
    "@/lib/server/mcp-tools": Object.fromEntries(["Resumen", "ListarVolcados", "LeerVolcado", "BuscarVolcados", "VersionesVolcado"].map(n => ["toolKhora" + n, business(n)])),
    "@/lib/server/mcp-ui-review": { toolKhoraUiReview: business("UiReview") },
    "@/lib/server/mcp-observability": Object.fromEntries(["EstadoVivo", "EventosRecientes", "ObservacionInstantanea", "EventosDesde"].map(n => ["toolKhora" + n, business(n)])),
    "@/lib/server/mcp-normative": {
      assertNormativeTurnOpen: async (_actor: string, token: string) => {
        if (options.denyTurn || token !== "test-token-not-a-real-credential") throw new Error("TURN_TOKEN_INVALID");
      },
      ...Object.fromEntries(["openNormativeTurn", "applyNormativePrinciple", "verifyNormativeTurn", "releaseNormativeTurn"].map(n => [n, business(n)])),
    },
    "@/lib/server/norm-check": {
      getCurrentSiSnapshot: async () => { if (options.healthError) throw new diagnostics.McpDiagnosticError("NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE", { upstream_status: 404, authentication: "sent", operation: "SI_MAIN_FETCH" }); return { version: "fixture", gitCommitSha: "a".repeat(40), gitBlobSha: "b".repeat(40) }; },
      getCurrentMethodologySnapshot: async () => ({ version: "fixture" }),
      getCurrentVerifierInfo: () => ({ protocol: receipt.NORM_CHECK_PROTOCOL, protocol_version: receipt.NORM_CHECK_PROTOCOL_VERSION, verifier_version: "fixture" }),
    },
  };
  const exported: Record<string, (request: Request) => Promise<Response>> = {};
  vm.runInNewContext(code, { exports: exported, process: { env: {} }, require: (name: string) => {
    if (!Object.hasOwn(modules, name)) throw new Error("Unexpected route dependency: " + name);
    return modules[name];
  } }, { timeout: 1000, filename: "mcp-route-fixture.cjs" });
  return {
    schemas, calls, url: config.canonicalUrl,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      return exported[request.method === "GET" ? "GET" : "POST"](request);
    },
    close: async () => { await Promise.all(servers.map(server => server.close())); },
  };
}
