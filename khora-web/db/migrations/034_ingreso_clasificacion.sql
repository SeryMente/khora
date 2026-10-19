-- Administrative, additive migration; do not run from MCP reads or session routes.
BEGIN;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS tipo_entrada text NOT NULL DEFAULT 'general';
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS ofuscada boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='volcado_tipo_entrada_check' AND conrelid='volcado'::regclass) THEN
    ALTER TABLE volcado ADD CONSTRAINT volcado_tipo_entrada_check CHECK (tipo_entrada IN ('general','conversacion_maya','interpretacion_simultanea','blog_personal'));
  END IF;
END $$;
COMMIT;
