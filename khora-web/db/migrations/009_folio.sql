-- @l0 L0-002-R · @req FOLIO-01/REQ-1
ALTER TABLE volcado ADD COLUMN IF NOT EXISTS folio INTEGER;

-- Backfill idempotente: numera solo lo que aún no tiene folio, continuando
-- desde el máximo existente. Correrlo dos veces no reasigna nada.
WITH base AS (
  SELECT COALESCE(max(folio), 0) AS m FROM volcado
),
ordenados AS (
  SELECT id, row_number() OVER (ORDER BY recibido_en ASC, id ASC) AS n
  FROM volcado
  WHERE folio IS NULL
)
UPDATE volcado v
SET folio = base.m + o.n
FROM ordenados o, base
WHERE v.id = o.id AND v.folio IS NULL;

-- La secuencia toma el relevo para las filas nuevas.
CREATE SEQUENCE IF NOT EXISTS volcado_folio_seq;
SELECT setval('volcado_folio_seq', COALESCE((SELECT max(folio) FROM volcado), 0), true);
ALTER TABLE volcado ALTER COLUMN folio SET DEFAULT nextval('volcado_folio_seq');
ALTER SEQUENCE volcado_folio_seq OWNED BY volcado.folio;

CREATE UNIQUE INDEX IF NOT EXISTS volcado_folio_uniq ON volcado (folio);
