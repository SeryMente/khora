-- Migración 001: esquema Jules completo
-- Aplicada en Neon prod el 2026-07-16 por el operador vía psql

CREATE TABLE IF NOT EXISTS jules_sessions (
  id               SERIAL PRIMARY KEY,
  jules_session_id TEXT UNIQUE NOT NULL,
  branch           TEXT,
  state            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  tarjeta_url      TEXT
);

CREATE TABLE IF NOT EXISTS jules_activities (
  id                    SERIAL PRIMARY KEY,
  session_id            INTEGER NOT NULL REFERENCES jules_sessions(id) ON DELETE CASCADE,
  jules_activity_id     TEXT UNIQUE NOT NULL,
  activity_type         TEXT,
  payload               JSONB,
  activity_created_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS poll_cursors (
  session_id       INTEGER PRIMARY KEY REFERENCES jules_sessions(id) ON DELETE CASCADE,
  last_create_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jules_ai_decisions (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES jules_sessions(id) ON DELETE CASCADE,
  question    TEXT,
  answer      TEXT,
  fail_reason TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
