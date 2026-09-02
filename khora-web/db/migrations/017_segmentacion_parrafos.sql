-- @l0 L0-002-R · Migración para soporte de segmentación en párrafos re-ejecutable como artefacto derivado
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS texto_estructurado TEXT;
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS estructura_ratificada_en TIMESTAMPTZ;
