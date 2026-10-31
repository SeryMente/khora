-- Khora MCP Custodia read contract.
-- Additive and idempotent: ensures the base and extended schema read by
-- khora_custodia_catalogo, khora_custodia_revisiones and
-- khora_custodia_verificar_integridad. It never changes or deletes user data.
-- The volcado table is part of the canonical Khora application schema.

CREATE TABLE IF NOT EXISTS dictado_session (
  session_id TEXT PRIMARY KEY,
  volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'uploading',
  total_partes INTEGER,
  duracion_seg INTEGER,
  creado_en TIMESTAMPTZ DEFAULT now(),
  cerrado_en TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dictado_session_volcado_id_uniq
  ON dictado_session(volcado_id)
  WHERE volcado_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dictado_audio_parte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES dictado_session(session_id) ON DELETE CASCADE,
  volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
  part_index INTEGER NOT NULL,
  blob_url TEXT NOT NULL,
  blob_path TEXT,
  bytes INTEGER NOT NULL,
  sha256 TEXT,
  fuente_audio TEXT NOT NULL DEFAULT 'microphone',
  original_name TEXT,
  mime_type TEXT,
  estado TEXT NOT NULL DEFAULT 'uploaded',
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  start_ms INTEGER,
  end_ms INTEGER,
  duracion_ms INTEGER,
  estado_verificacion TEXT DEFAULT 'pendiente',
  CONSTRAINT dictado_audio_parte_session_part_uniq UNIQUE(session_id,part_index)
);

CREATE INDEX IF NOT EXISTS dictado_audio_parte_session_id_idx
  ON dictado_audio_parte(session_id);
CREATE INDEX IF NOT EXISTS dictado_audio_parte_volcado_id_idx
  ON dictado_audio_parte(volcado_id);

ALTER TABLE dictado_session
  ADD COLUMN IF NOT EXISTS custodia_owner TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_text TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_usuario TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_en TIMESTAMPTZ;

ALTER TABLE dictado_audio_parte
  ADD COLUMN IF NOT EXISTS fuente_audio TEXT NOT NULL DEFAULT 'microphone',
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS start_ms INTEGER,
  ADD COLUMN IF NOT EXISTS end_ms INTEGER,
  ADD COLUMN IF NOT EXISTS duracion_ms INTEGER,
  ADD COLUMN IF NOT EXISTS estado_verificacion TEXT DEFAULT 'pendiente';

CREATE TABLE IF NOT EXISTS dictado_checkpoint (
  revision_id UUID PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
  usuario TEXT NOT NULL,
  client_at BIGINT NOT NULL,
  texto TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dictado_checkpoint_owner_idx
  ON dictado_checkpoint(usuario,creado_en DESC);
CREATE INDEX IF NOT EXISTS dictado_checkpoint_session_idx
  ON dictado_checkpoint(session_id,client_at DESC);

CREATE TABLE IF NOT EXISTS dictado_mp3 (
  session_id TEXT PRIMARY KEY REFERENCES dictado_session(session_id),
  estado TEXT NOT NULL DEFAULT 'pendiente',
  source_sha256 TEXT,
  blob_url TEXT,
  sha256 TEXT,
  bytes BIGINT,
  duracion_seg DOUBLE PRECISION,
  intentos INTEGER NOT NULL DEFAULT 0,
  lease_until TIMESTAMPTZ,
  ultimo_error TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dictado_mp3
  ADD COLUMN IF NOT EXISTS lease_id UUID,
  ADD COLUMN IF NOT EXISTS source_manifest TEXT,
  ADD COLUMN IF NOT EXISTS source_parts INTEGER,
  ADD COLUMN IF NOT EXISTS captura_completa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS siguiente_intento TIMESTAMPTZ NOT NULL DEFAULT now();
