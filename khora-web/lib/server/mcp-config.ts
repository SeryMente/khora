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
  const isPlaywright = process.env.PLAYWRIGHT_TEST_RUN === "1";
  const clientId = process.env.MCP_OAUTH_CLIENT_ID || (isPlaywright ? "mock-client-id" : undefined);
  const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET || (isPlaywright ? "mock-client-secret" : undefined);
  const redirectUrisRaw = process.env.MCP_OAUTH_REDIRECT_URIS || (isPlaywright ? "http://localhost:3000/callback" : undefined);
  const jwtSecret = process.env.MCP_JWT_SECRET || (isPlaywright ? "mock-jwt-secret-at-least-32-chars-long" : undefined);
  const allowedEmail = process.env.MCP_ALLOWED_EMAIL || (isPlaywright ? "test@example.com" : undefined);
  const rawCanonicalUrl =
    process.env.MCP_CANONICAL_URL ||
    (isPlaywright ? "http://localhost:3000/api/mcp" : undefined);

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
