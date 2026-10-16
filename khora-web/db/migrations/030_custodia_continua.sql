-- Additive only. Never deletes captures, checkpoints, originals or versions.
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS custodia_owner TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_text TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_sha256 TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_usuario TEXT;
ALTER TABLE dictado_session ADD COLUMN IF NOT EXISTS checkpoint_en TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS dictado_checkpoint (
  revision_id UUID PRIMARY KEY, session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
  usuario TEXT NOT NULL, client_at BIGINT NOT NULL, texto TEXT NOT NULL,
  sha256 TEXT NOT NULL, snapshot TEXT NOT NULL, creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dictado_checkpoint_owner_idx ON dictado_checkpoint(usuario, creado_en DESC);
CREATE INDEX IF NOT EXISTS dictado_checkpoint_session_idx ON dictado_checkpoint(session_id, client_at DESC);
CREATE TABLE IF NOT EXISTS dictado_mp3 (
  session_id TEXT PRIMARY KEY REFERENCES dictado_session(session_id), estado TEXT NOT NULL DEFAULT 'pendiente',
  source_sha256 TEXT, blob_url TEXT, sha256 TEXT, bytes BIGINT, duracion_seg DOUBLE PRECISION,
  intentos INTEGER NOT NULL DEFAULT 0, lease_until TIMESTAMPTZ, ultimo_error TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
