-- Reconstructible encrypted projections, separate from original custody and legacy judgments.
CREATE TABLE IF NOT EXISTS grafo_par_propuesta (
 id uuid PRIMARY KEY, owner text NOT NULL, volcado_id uuid NOT NULL REFERENCES volcado(id),
 version integer NOT NULL CHECK(version>0), sha256 char(64) NOT NULL, pipeline text NOT NULL,
 payload_cifrado text NOT NULL, cursor_actual integer NOT NULL DEFAULT 0, revision integer NOT NULL DEFAULT 0,
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner,volcado_id,version,sha256,pipeline)
);
CREATE TABLE IF NOT EXISTS grafo_par_juicio (
 id uuid PRIMARY KEY, owner text NOT NULL, proposal_id uuid NOT NULL REFERENCES grafo_par_propuesta(id),
 item_id char(64) NOT NULL, decision text NOT NULL CHECK(decision IN ('accept','reject')),
 sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE, actor text NOT NULL, origin text NOT NULL CHECK(origin='graph-twins-review-v1'),
 creado_en timestamptz NOT NULL DEFAULT now(), CHECK(owner=actor)
);
CREATE INDEX IF NOT EXISTS grafo_par_juicio_fuente ON grafo_par_juicio(owner,proposal_id,creado_en,id);
CREATE TABLE IF NOT EXISTS grafo_par_snapshot (
 owner text PRIMARY KEY, revision uuid NOT NULL, payload_cifrado text NOT NULL,
 actualizado_en timestamptz NOT NULL DEFAULT now()
);
-- Judgments are an append-only human record; never regenerated from extraction.
CREATE OR REPLACE FUNCTION impedir_mutacion_juicio_grafo_par() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'grafo_par_juicio is append-only'; END;
$$;
DROP TRIGGER IF EXISTS grafo_par_juicio_inmutable ON grafo_par_juicio;
CREATE TRIGGER grafo_par_juicio_inmutable BEFORE UPDATE OR DELETE ON grafo_par_juicio
 FOR EACH ROW EXECUTE FUNCTION impedir_mutacion_juicio_grafo_par();
