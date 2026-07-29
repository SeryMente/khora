-- @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS texto_original TEXT;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS editado_en TIMESTAMPTZ;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS ediciones INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS correccion (
  id UUID PRIMARY KEY,
  volcado_id UUID,
  antes TEXT NOT NULL,
  despues TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS correccion_antes_idx ON correccion (antes);
