-- Migración 018: Persistencia de propuestas de ingesta y actos de juicio (PROMPT 5A)
-- Separa derivados reconstruibles de juicios irreconstruibles (conforme al ProposalEnvelope ADR-013 / 5-0)

CREATE TABLE IF NOT EXISTS ingesta_propuesta (
  id UUID PRIMARY KEY,
  schema_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  volcado_id UUID NOT NULL,
  version INTEGER NOT NULL,
  sha256 CHAR(64) NOT NULL,
  pipeline_version VARCHAR(50) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  expira_en TIMESTAMPTZ NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ingesta_propuesta_terna_hash UNIQUE (volcado_id, version, sha256, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_ingesta_propuesta_terna ON ingesta_propuesta (volcado_id, version, sha256);
CREATE INDEX IF NOT EXISTS idx_ingesta_propuesta_estado ON ingesta_propuesta (estado);

CREATE TABLE IF NOT EXISTS ingesta_propuesta_item (
  id UUID NOT NULL,
  proposal_id UUID NOT NULL REFERENCES ingesta_propuesta(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('entity', 'relation')),
  label TEXT NOT NULL,
  anchor JSONB NOT NULL,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  triple JSONB NULL,
  metadata JSONB NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proposal_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ingesta_propuesta_item_proposal ON ingesta_propuesta_item (proposal_id);

-- Apéndice append-only para juicios/dictámenes del operador
CREATE TABLE IF NOT EXISTS ingesta_juicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judgment_id UUID NOT NULL UNIQUE,
  proposal_id UUID NOT NULL REFERENCES ingesta_propuesta(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('accept', 'reject', 'modify')),
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('ratificar', 'rechazar', 'enmendar')),
  actor TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  override_data JSONB NULL,
  motivo TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingesta_juicio_proposal ON ingesta_juicio (proposal_id);
CREATE INDEX IF NOT EXISTS idx_ingesta_juicio_item ON ingesta_juicio (proposal_id, item_id);

-- Acta de asiento (liquidación final)
CREATE TABLE IF NOT EXISTS ingesta_acta_asiento (
  act_id UUID PRIMARY KEY,
  proposal_id UUID NOT NULL UNIQUE REFERENCES ingesta_propuesta(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'partially_approved')),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_by TEXT NOT NULL,
  summary TEXT NOT NULL,
  graph_tx_id TEXT NULL,
  io_id TEXT NULL,
  conteos JSONB NULL,
  sello TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingesta_acta_proposal ON ingesta_acta_asiento (proposal_id);
