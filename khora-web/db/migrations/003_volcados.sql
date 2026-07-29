-- @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
-- Almacen verbatim append-only de volcados. Se escribe ANTES de invocar el pipeline.
CREATE TABLE IF NOT EXISTS volcado (
  id UUID PRIMARY KEY,
  texto TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  chars INTEGER NOT NULL,
  titulo TEXT,
  origen TEXT NOT NULL,
  driver TEXT,
  usuario TEXT,
  recibido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'archivado',
  io_id UUID,
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_error TEXT,
  ultimo_intento TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS volcado_recibido_idx ON volcado (recibido_en DESC);
CREATE INDEX IF NOT EXISTS volcado_estado_idx ON volcado (estado);
CREATE INDEX IF NOT EXISTS volcado_sha_idx ON volcado (sha256);
