-- @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
CREATE TABLE IF NOT EXISTS volcado_version (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL,
  version INTEGER NOT NULL,
  texto TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  chars INTEGER NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS volcado_version_uniq ON volcado_version (volcado_id, version);
ALTER TABLE correccion ADD COLUMN IF NOT EXISTS version_desde INTEGER;
ALTER TABLE correccion ADD COLUMN IF NOT EXISTS version_hasta INTEGER;
