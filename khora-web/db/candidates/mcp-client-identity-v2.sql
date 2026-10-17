-- CANDIDATE ONLY. Not in automatic migrations; production execution NOT authorized.
-- Additive, nullable, no backfill or relabeling. Enable application flag only
-- after separate schema/configuration/transition approval and integration tests.
BEGIN;
ALTER TABLE oauth_codes ADD COLUMN IF NOT EXISTS client_identity JSONB;
ALTER TABLE oauth_refresh_tokens ADD COLUMN IF NOT EXISTS client_identity JSONB;
ALTER TABLE mcp_manual_tokens ADD COLUMN IF NOT EXISTS client_identity JSONB;
ALTER TABLE normative_turns ADD COLUMN IF NOT EXISTS client_identity JSONB;
COMMIT;
