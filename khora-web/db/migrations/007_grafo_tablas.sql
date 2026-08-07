-- // @l0 L0-003 · @req GRAFO/TABLAS

CREATE TABLE IF NOT EXISTS nodos (
  id UUID PRIMARY KEY,
  summary TEXT NOT NULL DEFAULT 'Sin resumen',
  community INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  centrality NUMERIC NOT NULL DEFAULT 1.0,
  origen TEXT NOT NULL DEFAULT 'Desconocido',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  verificacion TEXT NOT NULL DEFAULT 'Pendiente',
  tipo TEXT,

  -- Procedencia completa
  volcado_id UUID,
  version INTEGER,
  sha256 CHAR(64),
  posicion_inicio INTEGER,
  posicion_fin INTEGER,
  sello_version_pipeline TEXT,
  marca_temporal_hecho TIMESTAMPTZ,
  marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nodos_volcado_id_idx ON nodos (volcado_id);
CREATE INDEX IF NOT EXISTS nodos_tipo_idx ON nodos (tipo);

CREATE TABLE IF NOT EXISTS aristas (
  id UUID PRIMARY KEY,
  source UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  target UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  origen TEXT NOT NULL DEFAULT 'Desconocido',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  verificacion TEXT NOT NULL DEFAULT 'Pendiente',

  -- Procedencia completa
  volcado_id UUID,
  version INTEGER,
  sha256 CHAR(64),
  posicion_inicio INTEGER,
  posicion_fin INTEGER,
  sello_version_pipeline TEXT,
  marca_temporal_hecho TIMESTAMPTZ,
  marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aristas_volcado_id_idx ON aristas (volcado_id);
