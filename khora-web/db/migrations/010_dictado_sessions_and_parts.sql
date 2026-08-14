-- @l0 L0-002 · @req TRACE-SESSION/010
-- Tabla de sesiones de dictado / captura
CREATE TABLE IF NOT EXISTS dictado_session (
    session_id TEXT PRIMARY KEY,
    volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'uploading', -- 'created', 'uploading', 'parts_complete', 'complete', 'failed', 'orphaned'
    total_partes INTEGER,
    duracion_seg INTEGER,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    cerrado_en TIMESTAMPTZ,
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Garantizar unicidad 1:1 entre volcado_id y session_id (cuando volcado_id no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS dictado_session_volcado_id_uniq
ON dictado_session (volcado_id)
WHERE volcado_id IS NOT NULL;

-- Tabla de partes de audio por sesión
CREATE TABLE IF NOT EXISTS dictado_audio_parte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES dictado_session(session_id) ON DELETE CASCADE,
    volcado_id UUID REFERENCES volcado(id) ON DELETE SET NULL,
    part_index INTEGER NOT NULL,
    blob_url TEXT NOT NULL,
    blob_path TEXT,
    bytes INTEGER NOT NULL,
    sha256 TEXT,
    estado TEXT NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'corrupt', 'missing'
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT dictado_audio_parte_session_part_uniq UNIQUE (session_id, part_index)
);

-- Columna session_id en la tabla volcado para referencia bidireccional limpia
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES dictado_session(session_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS volcado_session_id_uniq ON volcado (session_id) WHERE session_id IS NOT NULL;

-- Índices de desempeño
CREATE INDEX IF NOT EXISTS dictado_audio_parte_session_id_idx ON dictado_audio_parte (session_id);
CREATE INDEX IF NOT EXISTS dictado_audio_parte_volcado_id_idx ON dictado_audio_parte (volcado_id);
