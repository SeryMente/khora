-- Durable and additive handoff from the Dictado Crónica archive boundary to Integración.
-- No external provider/API is called by Dictado. A consumer owned by Integración claims queued rows.
CREATE TABLE IF NOT EXISTS integration_handoff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL,
  session_id TEXT NOT NULL REFERENCES dictado_session(session_id) ON DELETE RESTRICT,
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  source_sha256 CHAR(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  event_time TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'disabled')),
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  publication_authorized BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL CHECK (mode = 'cronica'),
  representations JSONB NOT NULL DEFAULT '{}'::jsonb,
  destinations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  owner TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_handoff_authorization_consistent CHECK (
    (state = 'queued' AND auto_publish = true AND publication_authorized = true)
    OR
    (state = 'disabled' AND auto_publish = false AND publication_authorized = false)
  ),
  CONSTRAINT integration_handoff_intent_session_uniq UNIQUE (intent_id, session_id),
  CONSTRAINT integration_handoff_source_version_uniq UNIQUE (session_id, volcado_id, version, source_sha256)
);

CREATE INDEX IF NOT EXISTS integration_handoff_queued_idx
  ON integration_handoff (created_at)
  WHERE state = 'queued';

CREATE INDEX IF NOT EXISTS integration_handoff_owner_idx
  ON integration_handoff (owner, created_at DESC);
