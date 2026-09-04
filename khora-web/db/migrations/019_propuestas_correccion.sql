-- Migration 019: Tablas para propuestas de corrección por capas (PROMPT 3A)
CREATE TABLE IF NOT EXISTS volcado_propuesta_correccion (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  terna TEXT NOT NULL,
  start_pos INTEGER NOT NULL,
  end_pos INTEGER NOT NULL,
  texto_original_exacto TEXT NOT NULL,
  reemplazo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  regla TEXT NOT NULL,
  explicacion TEXT NOT NULL,
  confianza REAL NOT NULL DEFAULT 1.0,
  proveedor TEXT NOT NULL,
  modelo TEXT NOT NULL,
  sello TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_volcado_ver_idx ON volcado_propuesta_correccion(volcado_id, version);
CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_terna_idx ON volcado_propuesta_correccion(terna);
CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_estado_idx ON volcado_propuesta_correccion(estado);
