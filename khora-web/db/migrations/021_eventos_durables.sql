-- @l0 L0-002-R · Migration 021: Durable Telemetry, Outbox & Idempotency Key Extensions
-- OBS-1: Durable collection of auto-observations for capture cycle telemetry

-- Update check constraint on fase to include 'captura'
ALTER TABLE eventos_sistema DROP CONSTRAINT IF EXISTS eventos_sistema_fase_check;
ALTER TABLE eventos_sistema ADD CONSTRAINT eventos_sistema_fase_check CHECK (fase IN ('dictado','transcripcion','revision','manejo','autorizacion','ingesta','grafo','captura'));

-- Extend eventos_sistema table with OBS-1 fields while preserving backward compatibility
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

-- Unique constraint on idempotency_key when provided
CREATE UNIQUE INDEX IF NOT EXISTS eventos_sistema_idempotency_key_idx ON eventos_sistema(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Additional operational indexes for telemetry queries
CREATE INDEX IF NOT EXISTS eventos_sistema_session_idx ON eventos_sistema(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_sistema_event_uuid_idx ON eventos_sistema(event_uuid) WHERE event_uuid IS NOT NULL;

-- Outbox table for server-side transactional durability when DB write fails or needs asynchronous delivery
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
