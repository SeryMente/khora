-- @l0 L0-002-R · Migration 023: Runtime state for direct model observability
-- Stores the latest semantic browser/UI state separately from immutable eventos_sistema history.

BEGIN;

CREATE TABLE IF NOT EXISTS khora_runtime_state (
  runtime_id TEXT PRIMARY KEY,
  session_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  route TEXT NOT NULL,
  screen TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  focused BOOLEAN NOT NULL DEFAULT FALSE,
  release_sha TEXT,
  source TEXT NOT NULL DEFAULT 'khora-ui',
  privacy_class TEXT NOT NULL DEFAULT 'ANONYMIZED_RUNTIME_STATE',
  state JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS khora_runtime_state_updated_idx
  ON khora_runtime_state(updated_at DESC);

CREATE INDEX IF NOT EXISTS khora_runtime_state_session_idx
  ON khora_runtime_state(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS khora_runtime_state_active_idx
  ON khora_runtime_state(active, updated_at DESC);

COMMIT;
