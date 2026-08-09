-- @l0 L0-002-R · @req REVISION/REQ-1
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS version_aprobada INTEGER;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS sha256_aprobado CHAR(64);
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMPTZ;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobador TEXT;

CREATE TABLE IF NOT EXISTS volcado_revision_auditoria (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL,
  accion TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  version INTEGER,
  sha256 CHAR(64),
  usuario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volcado_revision_auditoria_volcado_idx ON volcado_revision_auditoria (volcado_id);
