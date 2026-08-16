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
