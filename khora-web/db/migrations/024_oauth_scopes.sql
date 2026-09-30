-- @l0 L0-002-R · Migration 024: OAuth scopes for MCP runtime/data separation
-- Adds explicit scopes to authorization codes and refresh tokens without invalidating existing records.

BEGIN;

ALTER TABLE oauth_codes
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'volcados:read';

ALTER TABLE oauth_refresh_tokens
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'volcados:read';

CREATE INDEX IF NOT EXISTS idx_oauth_codes_scope ON oauth_codes(scope);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_scope ON oauth_refresh_tokens(scope);

COMMIT;
