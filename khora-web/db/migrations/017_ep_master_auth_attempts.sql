-- EP master-password rate limiting without retaining raw client addresses.
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
  ON ep_master_auth_attempts(attempted_at);
