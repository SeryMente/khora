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

-- Read contract: khora_lector is an externally provisioned, non-login group role.
DO $khora_reader_role$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'khora_lector'
      AND NOT rolcanlogin
      AND NOT rolsuper
      AND NOT rolbypassrls
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ) THEN
    RAISE EXCEPTION 'khora_lector must exist as a non-login, non-privileged group role';
  END IF;
END
$khora_reader_role$;

REVOKE ALL ON TABLE public.dictado_session, public.dictado_audio_parte,
  public.dictado_checkpoint, public.dictado_mp3 FROM PUBLIC;
REVOKE ALL ON TABLE public.dictado_session, public.dictado_audio_parte,
  public.dictado_checkpoint, public.dictado_mp3, public.volcado FROM khora_lector;

-- Clear any prior column grants as well as table-level grants before applying
-- the narrowly scoped read contract. This is idempotent on new and old schemas.
DO $khora_reader_columns$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT c.relname AS table_name, a.attname AS column_name
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'dictado_session', 'dictado_audio_parte', 'dictado_checkpoint',
        'dictado_mp3', 'volcado'
      )
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format(
      'REVOKE ALL (%I) ON TABLE public.%I FROM khora_lector',
      item.column_name,
      item.table_name
    );
    IF item.table_name <> 'volcado' THEN
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE public.%I FROM PUBLIC',
        item.column_name,
        item.table_name
      );
    END IF;
  END LOOP;
END
$khora_reader_columns$;

GRANT SELECT (
  session_id, volcado_id, estado, total_partes, creado_en, actualizado_en,
  cerrado_en, custodia_owner, checkpoint_usuario
) ON TABLE public.dictado_session TO khora_lector;
GRANT SELECT (
  session_id, part_index, bytes, sha256, blob_url, estado_verificacion
) ON TABLE public.dictado_audio_parte TO khora_lector;
GRANT SELECT (
  revision_id, session_id, usuario, creado_en, client_at, sha256, snapshot
) ON TABLE public.dictado_checkpoint TO khora_lector;
GRANT SELECT (
  session_id, estado, captura_completa, source_parts, actualizado_en
) ON TABLE public.dictado_mp3 TO khora_lector;
GRANT SELECT (id, folio, usuario, session_id)
  ON TABLE public.volcado TO khora_lector;
