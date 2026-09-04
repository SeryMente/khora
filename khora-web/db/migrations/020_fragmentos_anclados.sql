-- Migration 020: Tabla para fragmentos literales anclados (PROMPT 8 - Arranque IAR)
CREATE TABLE IF NOT EXISTS volcado_fragmento_anclado (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  terna TEXT NOT NULL,
  start_pos INTEGER NOT NULL,
  end_pos INTEGER NOT NULL,
  cita_exacta TEXT NOT NULL,
  hash_fragmento CHAR(64) NOT NULL,
  sello TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_volcado_ver_idx ON volcado_fragmento_anclado(volcado_id, version);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_terna_idx ON volcado_fragmento_anclado(terna);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_sello_idx ON volcado_fragmento_anclado(sello);
CREATE INDEX IF NOT EXISTS volcado_fragmento_anclado_hash_idx ON volcado_fragmento_anclado(hash_fragmento);
