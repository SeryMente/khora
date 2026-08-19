-- @l0 L0-002-R · Migración idempotente para normalizar índices de partes de dictado a 1-based

DO $$
BEGIN
    -- Comprobar si existen registros 0-based en dictado_audio_parte
    IF EXISTS (SELECT 1 FROM dictado_audio_parte WHERE part_index = 0) THEN
        -- Desplazar temporalmente a valores negativos para evitar colisiones UNIQUE
        UPDATE dictado_audio_parte
        SET part_index = - (part_index + 1)
        WHERE session_id IN (
            SELECT session_id FROM dictado_audio_parte WHERE part_index = 0
        );

        -- Convertir de valores negativos a 1-based ( -(-val) )
        UPDATE dictado_audio_parte
        SET part_index = -part_index
        WHERE part_index < 0;
    END IF;
END $$;
