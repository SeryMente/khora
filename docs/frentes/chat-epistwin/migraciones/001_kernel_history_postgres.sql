-- Additive, isolated kernel H_t storage. Not automatically applied at startup.
-- Apply only to the existing authorized database after backup/access preflight.
-- Does not create or change semantic PKG, capture, account or Open WebUI tables.
BEGIN;
CREATE SCHEMA IF NOT EXISTS khora_chat_kernel;
REVOKE ALL ON SCHEMA khora_chat_kernel FROM PUBLIC;
CREATE TABLE IF NOT EXISTS khora_chat_kernel.sessions (
    session_id TEXT PRIMARY KEY,
    ht_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
REVOKE ALL ON TABLE khora_chat_kernel.sessions FROM PUBLIC;
COMMIT;
-- Grant an existing least-privilege runtime role USAGE on this schema and
-- SELECT, INSERT, UPDATE on this table; no CREATE or PKG grants are required.
-- Role selection and secret injection are server-side deployment prerequisites.
-- Rollback: disable PostgreSQL binding first; preserve/export recorded histories.
-- No automatic DROP or fallback to empty ephemeral SQLite is permitted.
