-- @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-1
-- Migración 011: Tablas para el servidor de autorización OAuth2 y revocación MCP

CREATE TABLE IF NOT EXISTS oauth_codes (
  id SERIAL PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,
  code_challenge TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  resource TEXT NOT NULL,
  usuario TEXT NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_hash ON oauth_codes(code_hash);

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id SERIAL PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  usuario TEXT NOT NULL,
  resource TEXT NOT NULL,
  emitido_en TIMESTAMPTZ DEFAULT NOW(),
  expira_en TIMESTAMPTZ NOT NULL,
  rotado_a TEXT
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_hash ON oauth_refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS mcp_revocacion (
  usuario TEXT PRIMARY KEY,
  generacion INTEGER NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);
