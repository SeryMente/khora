-- @l0 L0-002-R · Migración idempotente para cambiar el valor por defecto de estado en volcado a 'en_revision'

DO $$
BEGIN
    -- 1. Alterar DEFAULT de la columna estado
    ALTER TABLE volcado ALTER COLUMN estado SET DEFAULT 'en_revision';

    -- 2. Migrar registros históricos en estado 'archivado' a 'en_revision'
    UPDATE volcado
    SET estado = 'en_revision'
    WHERE estado = 'archivado';
END $$;
