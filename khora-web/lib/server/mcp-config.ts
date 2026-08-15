// @l0 L0-002 §4 · @req MCP-CFG-01/REQ-1

export interface McpConfig {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  jwtSecret: string;
  allowedEmail: string;
  canonicalUrl: string;
  readonlyDatabaseUrl?: string;
}

export function getMcpConfig(): McpConfig | null {
  const clientId = process.env.MCP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MCP_OAUTH_CLIENT_SECRET;
  const redirectUrisRaw = process.env.MCP_OAUTH_REDIRECT_URIS;
  const jwtSecret = process.env.MCP_JWT_SECRET;
  const allowedEmail = process.env.MCP_ALLOWED_EMAIL;
  const canonicalUrl = process.env.MCP_CANONICAL_URL || (process.env.PLAYWRIGHT_TEST_RUN === '1' ? 'http://localhost:3000' : undefined);

  if (!clientId || !clientSecret || !redirectUrisRaw || !jwtSecret || !allowedEmail || !canonicalUrl) {
    return null;
  }

  const redirectUris = redirectUrisRaw.split(',').map(s => s.trim()).filter(Boolean);
  const readonlyDatabaseUrl = process.env.KHORA_READONLY_DATABASE_URL;

  return {
    clientId,
    clientSecret,
    redirectUris,
    jwtSecret,
    allowedEmail,
    canonicalUrl: canonicalUrl.replace(/\/$/, ""),
    readonlyDatabaseUrl
  };
}
