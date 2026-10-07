// @l0 L0-002 §4 · @req MCP-CFG-01/REQ-1
import { createHmac, timingSafeEqual } from "node:crypto";

export interface McpConfig {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  jwtSecret: string;
  allowedEmail: string;
  canonicalUrl: string; // Protected Resource URL (e.g., https://khora.example.com/api/mcp)
  issuer: string; // Authorization Server Issuer (e.g., https://khora.example.com)
  readonlyDatabaseUrl?: string;
}

export function getMcpConfig(): McpConfig | null {
const isTest = process.env.PLAYWRIGHT_TEST_RUN === "1" || process.env.NODE_ENV === "test";

const clientId = process.env.MCP_OAUTH_CLIENT_ID || (isTest ? "test-client-id" : undefined);
const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET || (isTest ? "test-client-secret" : undefined);
const redirectUrisRaw = process.env.MCP_OAUTH_REDIRECT_URIS || (isTest ? "http://localhost:3000/callback" : undefined);
const jwtSecret = process.env.MCP_JWT_SECRET || (isTest ? "test-jwt-secret-min-32-chars-long" : undefined);
const allowedEmail = process.env.MCP_ALLOWED_EMAIL || (isTest ? "test@example.com" : undefined);
const rawCanonicalUrl =
  process.env.MCP_CANONICAL_URL ||
  (isTest
    ? "http://localhost:3000/api/mcp"
    : undefined);

  if (
    !clientId ||
    !clientSecret ||
    !redirectUrisRaw ||
    !jwtSecret ||
    !allowedEmail ||
    !rawCanonicalUrl
  ) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawCanonicalUrl);
  } catch {
    return null;
  }

  const canonicalUrl = rawCanonicalUrl.replace(/\/$/, "");
  const issuer = parsedUrl.origin;

  const redirectUris = redirectUrisRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const readonlyDatabaseUrl = process.env.KHORA_READONLY_DATABASE_URL;

  return {
    clientId,
    clientSecret,
    redirectUris,
    jwtSecret,
    allowedEmail,
    canonicalUrl,
    issuer,
    readonlyDatabaseUrl,
  };
}

export function getProtectedResourceMetadata(config = getMcpConfig()) {
  if (!config) return null;
  return {
    resource: config.canonicalUrl,
    authorization_servers: [config.issuer],
    scopes_supported: ["runtime:read", "volcados:read", "norm:turn"],
  };
}


export async function validateCimdClient(
  clientId: string,
  redirectUri: string,
): Promise<boolean> {
  try {
    const parsed = new URL(clientId);
    if (parsed.protocol !== "https:" || parsed.hostname !== "chatgpt.com") return false;
    if (!/^\/oauth\/(?:client\.json|[^/]+\/client\.json)$/.test(parsed.pathname)) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(clientId, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return false;
      const document = (await response.json()) as {
        client_id?: unknown;
        redirect_uris?: unknown;
        token_endpoint_auth_methods_supported?: unknown;
        token_endpoint_auth_method?: unknown;
      };
      if (document.client_id !== clientId) return false;
      if (!Array.isArray(document.redirect_uris) || !document.redirect_uris.includes(redirectUri)) return false;

      const methods = Array.isArray(document.token_endpoint_auth_methods_supported)
        ? document.token_endpoint_auth_methods_supported.map(String)
        : document.token_endpoint_auth_method
          ? [String(document.token_endpoint_auth_method)]
          : [];

      return methods.includes("none");
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}


export interface DynamicClientMetadata {
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method: "none";
  iat: number;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function isAllowedDynamicRedirect(uri: string): boolean {
  try {
    const url = new URL(uri);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      (host === "notion.com" || host.endsWith(".notion.com") || host === "notion.so" || host.endsWith(".notion.so"));
  } catch {
    return false;
  }
}

export function createDynamicClientId(
  metadata: Omit<DynamicClientMetadata, "iat">,
  secret: string,
): string {
  const payload = base64url(JSON.stringify({ ...metadata, iat: Math.floor(Date.now() / 1000) }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `khora-dcr.${payload}.${signature}`;
}

export function getDynamicClientMetadata(
  clientId: string,
  secret: string,
): DynamicClientMetadata | null {
  const parts = clientId.split(".");
  if (parts.length !== 3 || parts[0] !== "khora-dcr") return null;
  const expected = createHmac("sha256", secret).update(parts[1]).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(parts[2], "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as DynamicClientMetadata;
    if (!Array.isArray(value.redirect_uris) || value.redirect_uris.length === 0) return null;
    if (!value.redirect_uris.every(isAllowedDynamicRedirect)) return null;
    if (value.token_endpoint_auth_method !== "none" || !Number.isInteger(value.iat)) return null;
    return value;
  } catch {
    return null;
  }
}

export function validateDynamicClient(
  clientId: string,
  secret: string,
  redirectUri?: string,
): boolean {
  const metadata = getDynamicClientMetadata(clientId, secret);
  return !!metadata && (!redirectUri || metadata.redirect_uris.includes(redirectUri));
}
