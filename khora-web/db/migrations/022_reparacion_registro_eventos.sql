-- @l0 L0-002-R · Migration 022: Idempotent Repair for eventos_sistema & eventos_outbox
-- OBS-1F: Guarantees table presence, extended OBS-1 columns, constraints, and indexes on historical stores.

BEGIN;

-- 1. Ensure Table eventos_sistema exists
CREATE TABLE IF NOT EXISTS eventos_sistema (
  id BIGSERIAL PRIMARY KEY,
  fase TEXT NOT NULL,
  event_id TEXT NOT NULL,
  estado TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  detalle JSONB,
  volcado_id UUID,
  version INTEGER,
  sha256 TEXT,
  correlacion_id UUID,
  servidor_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_en TIMESTAMPTZ,
  hash_anterior TEXT,
  event_hash TEXT
);

-- 2. Ensure check constraints on fase and estado are updated idempotently
ALTER TABLE eventos_sistema DROP CONSTRAINT IF EXISTS eventos_sistema_fase_check;
ALTER TABLE eventos_sistema ADD CONSTRAINT eventos_sistema_fase_check CHECK (fase IN ('dictado','transcripcion','revision','manejo','autorizacion','ingesta','grafo','captura'));

ALTER TABLE eventos_sistema DROP CONSTRAINT IF EXISTS eventos_sistema_estado_check;
ALTER TABLE eventos_sistema ADD CONSTRAINT eventos_sistema_estado_check CHECK (estado IN ('START','OK','FAIL','INFO','SKIP'));

-- 3. Idempotently add missing extended OBS-1 columns to eventos_sistema
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS event_uuid UUID UNIQUE;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0';
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS component TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS causation_id UUID;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS attempt_id TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS sequence BIGINT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS release_sha TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS metrics JSONB;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE eventos_sistema ADD COLUMN IF NOT EXISTS privacy_class TEXT DEFAULT 'SYSTEM_AUDIT';

-- 4. Idempotently create performance and integrity indexes
CREATE INDEX IF NOT EXISTS eventos_sistema_fase_idx ON eventos_sistema(fase);
CREATE INDEX IF NOT EXISTS eventos_sistema_correlacion_idx ON eventos_sistema(correlacion_id);
CREATE INDEX IF NOT EXISTS eventos_sistema_volcado_idx ON eventos_sistema(volcado_id);
CREATE INDEX IF NOT EXISTS eventos_sistema_servidor_idx ON eventos_sistema(servidor_en DESC);
CREATE UNIQUE INDEX IF NOT EXISTS eventos_sistema_idempotency_key_idx ON eventos_sistema(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_sistema_session_idx ON eventos_sistema(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_sistema_event_uuid_idx ON eventos_sistema(event_uuid) WHERE event_uuid IS NOT NULL;

-- 5. Ensure Table eventos_outbox exists
CREATE TABLE IF NOT EXISTS eventos_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_uuid UUID NOT NULL UNIQUE,
  correlacion_id UUID NOT NULL,
  idempotency_key TEXT,
  payload JSONB NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDING' CHECK (estado IN ('PENDING', 'PROCESSED', 'FAILED')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_ultimo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  procesado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS eventos_outbox_estado_idx ON eventos_outbox(estado) WHERE estado = 'PENDING';

COMMIT;
