-- Server-side operational secrets. No plaintext or token prefixes in metadata/audit.
CREATE TABLE IF NOT EXISTS github_credentials (
  usuario text NOT NULL, purpose text NOT NULL CHECK (purpose IN ('norm','ep')),
  ciphertext text NOT NULL CHECK (ciphertext LIKE 'khc1.%'),
  actualizado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(usuario,purpose)
);
CREATE TABLE IF NOT EXISTS github_credential_events (
  id bigserial PRIMARY KEY, usuario text NOT NULL, purpose text NOT NULL CHECK (purpose IN ('norm','ep')),
  operation text NOT NULL CHECK (operation IN ('save','delete')), creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS github_credential_events_user_time ON github_credential_events(usuario,creado_en DESC);
REVOKE ALL ON github_credentials, github_credential_events FROM PUBLIC;
ALTER TABLE github_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_credential_events ENABLE ROW LEVEL SECURITY;
-- No reader policies: non-owner roles cannot read secrets even through default SELECT grants.
