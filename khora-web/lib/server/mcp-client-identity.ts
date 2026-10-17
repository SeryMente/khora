import { randomUUID } from "node:crypto";

// Additive opt-in. No automatic backfill, relabeling, revocation or schema DDL.
export const BOUND_IDENTITY_VERSION = "mcp-client-identity/v1" as const;
export const BOUND_OUTPUT_FORMAT_VERSION = "v1.8.0" as const;
export const CLIENT_PLATFORMS = ["ChatGPT", "Notion"] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];
export type McpClientIdentity = {
  version: typeof BOUND_IDENTITY_VERSION;
  client_id: string;
  grant_id: string;
  platform: ClientPlatform;
  assurance: "owner-configured";
};
export function clientIdentityEnabled(): boolean {
  return process.env.KHORA_MCP_CLIENT_IDENTITY_V2 === "1";
}
export function identityProjection(): string {
  return clientIdentityEnabled() ? ", client_identity" : "";
}
export function isMcpClientIdentity(value: unknown): value is McpClientIdentity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return Object.keys(x).sort().join(",") === "assurance,client_id,grant_id,platform,version" &&
    x.version === BOUND_IDENTITY_VERSION && x.assurance === "owner-configured" &&
    typeof x.client_id === "string" && x.client_id.length > 0 && x.client_id.length <= 2048 &&
    x.client_id.trim() === x.client_id && !/[\u0000-\u001F\u007F]/.test(x.client_id) &&
    typeof x.grant_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x.grant_id) &&
    CLIENT_PLATFORMS.includes(x.platform as ClientPlatform);
}
export function readClientIdentity(value: unknown): McpClientIdentity | null {
  if (value === undefined || value === null) return null; // historical, not attested
  if (!clientIdentityEnabled() || !isMcpClientIdentity(value)) throw new Error("MCP_CLIENT_IDENTITY_INVALID");
  return value;
}
export function sameClientIdentity(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (!isMcpClientIdentity(a) || !isMcpClientIdentity(b)) return false;
  return a.version === b.version && a.client_id === b.client_id && a.grant_id === b.grant_id &&
    a.platform === b.platform && a.assurance === b.assurance;
}
export function assertClientIdentityMatch(a: unknown, b: unknown): void {
  readClientIdentity(a); readClientIdentity(b);
  if (!sameClientIdentity(a,b)) throw new Error("MCP_CLIENT_IDENTITY_MISMATCH");
}
// Only call after existing OAuth client/redirect/owner/consent validation, or
// authenticated owner creation of a manual token. This is not vendor attestation.
export function configuredClientIdentity(clientId: string): McpClientIdentity | null {
  if (!clientIdentityEnabled()) return null;
  let registry: unknown;
  try { registry = JSON.parse(process.env.KHORA_MCP_CLIENT_PROFILES_JSON || "{}"); }
  catch { throw new Error("MCP_CLIENT_PROFILE_CONFIG_INVALID"); }
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) throw new Error("MCP_CLIENT_PROFILE_CONFIG_INVALID");
  if (!Object.hasOwn(registry, clientId)) throw new Error("MCP_CLIENT_PROFILE_REQUIRED");
  const platform = (registry as Record<string, unknown>)[clientId];
  const identity = {version: BOUND_IDENTITY_VERSION, client_id: clientId, grant_id: randomUUID(), platform, assurance: "owner-configured"};
  if (!isMcpClientIdentity(identity)) throw new Error("MCP_CLIENT_PROFILE_CONFIG_INVALID");
  return identity;
}
