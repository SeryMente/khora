-- DRAFT ONLY: not applied, not discovered by the runtime migration runner.
-- Requires operator-approved migration, verified private DB/TLS, backup and
-- rollback plan before any route is exposed. Contains encrypted transactions
-- only, NOT Google tokens, archive content or corpus units.
CREATE TABLE IF NOT EXISTS khora_takeout_oauth_transactions (
 owner_hash text NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
 state_hash text NOT NULL CHECK (state_hash ~ '^[a-f0-9]{64}$'),
 sealed bytea NOT NULL CHECK (octet_length(sealed) BETWEEN 33 AND 16416),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms > 0),
 PRIMARY KEY (owner_hash,state_hash)
);
CREATE INDEX IF NOT EXISTS khora_takeout_oauth_expiry_idx
 ON khora_takeout_oauth_transactions (expires_at_ms);
-- Expired transaction cleanup must be bounded and scheduled by approved
-- runtime; no plaintext fallback, owner inference or automatic migration.
