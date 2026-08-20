-- @l0 L0-002-R · Migración compensatoria para fijar DEFAULT de estado en 'pendiente_revision'

DO $$
BEGIN
    -- Alterar DEFAULT de la columna estado a 'pendiente_revision'
    ALTER TABLE volcado ALTER COLUMN estado SET DEFAULT 'pendiente_revision';
END $$;
