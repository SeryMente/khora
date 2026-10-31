-- Additive ledger for a non-destructive Vercel Blob -> Backblaze B2 migration.
-- Original Blob objects are retained; this table records verified copies and pointer updates.
CREATE TABLE IF NOT EXISTS custodia_blob_b2_migration (
  source_url_sha256 CHAR(64) PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  destination_url TEXT,
  source_clear_sha256 CHAR(64),
  source_clear_bytes BIGINT,
  source_encrypted_sha256 CHAR(64),
  source_encrypted_bytes BIGINT,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'quarantined', 'copied_verified', 'references_updated', 'failed')),
  reference_occurrences BIGINT NOT NULL DEFAULT 0,
  updated_references BIGINT NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custodia_blob_b2_migration_hashes_valid
    CHECK (
      source_url_sha256 ~ '^[a-f0-9]{64}$'
      AND (source_clear_sha256 IS NULL OR source_clear_sha256 ~ '^[a-f0-9]{64}$')
      AND (source_encrypted_sha256 IS NULL OR source_encrypted_sha256 ~ '^[a-f0-9]{64}$')
    )
);

CREATE INDEX IF NOT EXISTS custodia_blob_b2_migration_state_idx
  ON custodia_blob_b2_migration (state, updated_at);
