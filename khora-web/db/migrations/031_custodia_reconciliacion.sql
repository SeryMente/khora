-- Additive: never delete captures, source audio, snapshots or derived revisions.
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS lease_id UUID;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS source_manifest TEXT;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS source_parts INTEGER;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS captura_completa BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dictado_mp3 ADD COLUMN IF NOT EXISTS siguiente_intento TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS dictado_mp3_historial (
 id UUID PRIMARY KEY, session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
 source_manifest TEXT NOT NULL, source_parts INTEGER NOT NULL, captura_completa BOOLEAN NOT NULL,
 blob_url TEXT NOT NULL, sha256 TEXT NOT NULL, bytes BIGINT NOT NULL, duracion_seg DOUBLE PRECISION NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(session_id, source_manifest)
);
CREATE TABLE IF NOT EXISTS dictado_custodia_trabajo (
 clave TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES dictado_session(session_id),
 usuario TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN ('titulo','espejo')),
 payload TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente', intentos INTEGER NOT NULL DEFAULT 0,
 lease_id UUID, lease_until TIMESTAMPTZ, siguiente_intento TIMESTAMPTZ NOT NULL DEFAULT now(),
 ultimo_error TEXT, resultado TEXT, creado_en TIMESTAMPTZ NOT NULL DEFAULT now(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dictado_custodia_due_idx ON dictado_custodia_trabajo(usuario,siguiente_intento) WHERE estado <> 'completo';
