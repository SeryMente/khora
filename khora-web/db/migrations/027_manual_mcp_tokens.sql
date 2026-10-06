-- @l0 L0-002-R · Migration 027: managed manual Bearer tokens for MCP

BEGIN;

CREATE TABLE IF NOT EXISTS mcp_manual_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  usuario TEXT NOT NULL,
  resource TEXT NOT NULL,
  scope TEXT NOT NULL,
  generacion INTEGER NOT NULL CHECK (generacion > 0),
  etiqueta TEXT NOT NULL DEFAULT 'MCP manual',
  emitido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en TIMESTAMPTZ NOT NULL,
  ultimo_uso_en TIMESTAMPTZ,
  revocado_en TIMESTAMPTZ,
  CONSTRAINT mcp_manual_tokens_expiry_ck CHECK (expira_en > emitido_en)
);

CREATE INDEX IF NOT EXISTS idx_mcp_manual_tokens_usuario
  ON mcp_manual_tokens (usuario, emitido_en DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_manual_tokens_active
  ON mcp_manual_tokens (usuario, generacion, expira_en)
  WHERE revocado_en IS NULL;

COMMIT;
