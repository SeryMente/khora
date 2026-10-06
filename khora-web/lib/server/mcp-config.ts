// @l0 L0-002 §4 · @req MCP-CFG-01/REQ-1

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
