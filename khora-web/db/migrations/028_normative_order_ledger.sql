ALTER TABLE normative_turns
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'ChatGPT',
  ADD COLUMN IF NOT EXISTS reasoning_mode TEXT NOT NULL DEFAULT 'THINKING',
  ADD COLUMN IF NOT EXISTS output_format_version TEXT NOT NULL DEFAULT 'v1.7.2',
  ADD COLUMN IF NOT EXISTS si_git_commit_sha TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS application_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS application_vector JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE normative_receipts
  ADD COLUMN IF NOT EXISTS si_git_commit_sha TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS order_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_log_sha256 TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS normative_turns_opened_at_idx
  ON normative_turns (opened_at DESC);

CREATE INDEX IF NOT EXISTS normative_turns_status_idx
  ON normative_turns (status, opened_at DESC);
