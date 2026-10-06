CREATE TABLE IF NOT EXISTS normative_turns (
  cycle_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  turn_number INTEGER,
  actor TEXT NOT NULL,
  current_attempt INTEGER NOT NULL CHECK (current_attempt > 0),
  status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),
  nonce TEXT NOT NULL UNIQUE,
  si_version TEXT NOT NULL,
  si_git_blob_sha TEXT NOT NULL,
  si_sha256 TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  manifest JSONB NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  verified_attempt INTEGER
);

CREATE INDEX IF NOT EXISTS normative_turns_opened_at_idx
  ON normative_turns (opened_at DESC);

CREATE INDEX IF NOT EXISTS normative_turns_status_idx
  ON normative_turns (status, opened_at DESC);
