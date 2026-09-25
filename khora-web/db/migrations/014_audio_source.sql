-- Khora Ingreso: distinguir la fuente de audio persistida.
ALTER TABLE dictado_audio_parte
  ADD COLUMN IF NOT EXISTS fuente_audio TEXT NOT NULL DEFAULT 'microphone';

UPDATE dictado_audio_parte
SET fuente_audio = 'microphone'
WHERE fuente_audio IS NULL;
