-- EP credential vault and EP-only master-password bootstrap.
CREATE TABLE IF NOT EXISTS ep_github_credential_vault (
  singleton_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
  ciphertext TEXT NOT NULL,
  github_login TEXT NOT NULL,
  token_suffix CHAR(4) NOT NULL,
  repository_access JSONB NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (length(ciphertext) > 40),
  CHECK (token_suffix ~ '^[A-Za-z0-9_]{4}$')
);

CREATE TABLE IF NOT EXISTS ep_master_password (
  singleton_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
  salt_hex CHAR(64) NOT NULL CHECK (salt_hex ~ '^[0-9a-f]{64}$'),
  verifier_hex CHAR(128) NOT NULL CHECK (verifier_hex ~ '^[0-9a-f]{128}$'),
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ep_master_auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  source_hash CHAR(64) NOT NULL CHECK (source_hash ~ '^[0-9a-f]{64}$'),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ep_master_auth_attempts_source_time
  ON ep_master_auth_attempts(source_hash, attempted_at DESC)
  WHERE succeeded = false;
CREATE INDEX IF NOT EXISTS idx_ep_master_auth_attempts_time
  ON ep_master_auth_attempts(attempted_at DESC);
