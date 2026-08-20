-- Entorno Persistente v1.0: tokens efimeros por sesion y bitacora remota encadenada
CREATE TABLE IF NOT EXISTS ep_sessions (
  id UUID PRIMARY KEY,
  usuario TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'issued',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bootstrap_recogido_en TIMESTAMPTZ,
  ultimo_evento_en TIMESTAMPTZ,
  cerrado_en TIMESTAMPTZ,
  siguiente_secuencia BIGINT NOT NULL DEFAULT 1,
  ultimo_hash TEXT NOT NULL DEFAULT repeat('0', 64)
);
CREATE INDEX IF NOT EXISTS idx_ep_sessions_usuario_creado ON ep_sessions(usuario, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ep_sessions_estado ON ep_sessions(estado);

CREATE TABLE IF NOT EXISTS ep_bootstrap_tokens (
  jti_hash TEXT PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL REFERENCES ep_sessions(id) ON DELETE CASCADE,
  usuario TEXT NOT NULL,
  emitido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en TIMESTAMPTZ NOT NULL,
  consumido_en TIMESTAMPTZ,
  revocado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ep_tokens_usuario ON ep_bootstrap_tokens(usuario, emitido_en DESC);
CREATE INDEX IF NOT EXISTS idx_ep_tokens_expira ON ep_bootstrap_tokens(expira_en);

CREATE TABLE IF NOT EXISTS ep_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ep_sessions(id) ON DELETE CASCADE,
  secuencia BIGINT NOT NULL,
  event_id TEXT NOT NULL CHECK (event_id ~ '^EP-(IN|RUN|OUT)-[0-9]{3}$'),
  estado TEXT NOT NULL CHECK (estado IN ('START','OK','FAIL','INFO','SKIP')),
  mensaje TEXT NOT NULL DEFAULT '',
  duracion_ms BIGINT,
  cliente_en TIMESTAMPTZ,
  servidor_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detalle JSONB,
  hash_anterior TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  UNIQUE(session_id, secuencia),
  UNIQUE(session_id, event_hash)
);
CREATE INDEX IF NOT EXISTS idx_ep_events_session_seq ON ep_events(session_id, secuencia);
