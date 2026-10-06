CREATE TABLE IF NOT EXISTS normative_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  protocol TEXT NOT NULL CHECK (protocol = 'NORM-CHECK'),
  protocol_version TEXT NOT NULL,
  si_version TEXT NOT NULL,
  si_git_blob_sha TEXT NOT NULL,
  si_sha256 TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  input_sha256 TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  output_sha256 TEXT NOT NULL,
  evidence_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VERIFIED','INVALID','INCOMPLETE')),
  integrity TEXT NOT NULL CHECK (integrity IN ('PASS','FAIL')),
  coverage_expected INTEGER NOT NULL,
  coverage_evaluated INTEGER NOT NULL,
  coverage_missing INTEGER NOT NULL,
  coverage_duplicates INTEGER NOT NULL DEFAULT 0,
  coverage_unknown INTEGER NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  receipt JSONB NOT NULL,
  verifier_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, attempt)
);

CREATE INDEX IF NOT EXISTS normative_receipts_created_at_idx
  ON normative_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS normative_receipts_cycle_idx
  ON normative_receipts (cycle_id, attempt DESC);

CREATE INDEX IF NOT EXISTS normative_receipts_status_idx
  ON normative_receipts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS normative_receipts_si_idx
  ON normative_receipts (si_git_blob_sha);
