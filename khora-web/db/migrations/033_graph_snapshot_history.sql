-- Bind new human acts to exact meaning/provenance, not just transport IDs.
-- Existing acts remain NULL: do not manufacture a retrospective signature.
ALTER TABLE grafo_par_juicio ADD COLUMN IF NOT EXISTS item_fingerprint char(64);
-- Preserve ciphertext exactly, including the last legacy snapshot. This cannot
-- reconstruct snapshots already overwritten before this migration.
CREATE TABLE IF NOT EXISTS grafo_par_historia (
 owner text NOT NULL, revision uuid NOT NULL, payload_cifrado text NOT NULL,
 registrado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner,revision)
);
CREATE OR REPLACE FUNCTION guardar_historia_grafo_par() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_payload text;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  INSERT INTO grafo_par_historia(owner,revision,payload_cifrado)
   VALUES(OLD.owner,OLD.revision,OLD.payload_cifrado) ON CONFLICT DO NOTHING;
  SELECT payload_cifrado INTO previous_payload FROM grafo_par_historia WHERE owner=OLD.owner AND revision=OLD.revision;
  IF previous_payload IS DISTINCT FROM OLD.payload_cifrado THEN RAISE EXCEPTION 'graph_history_revision_conflict'; END IF;
 END IF;
 INSERT INTO grafo_par_historia(owner,revision,payload_cifrado)
  VALUES(NEW.owner,NEW.revision,NEW.payload_cifrado) ON CONFLICT DO NOTHING;
 SELECT payload_cifrado INTO previous_payload FROM grafo_par_historia WHERE owner=NEW.owner AND revision=NEW.revision;
 IF previous_payload IS DISTINCT FROM NEW.payload_cifrado THEN RAISE EXCEPTION 'graph_history_revision_conflict'; END IF;
 RETURN NEW;
END;
$$;
-- Initial archival is idempotent and retains legacy content without inventing metadata.
INSERT INTO grafo_par_historia(owner,revision,payload_cifrado)
 SELECT owner,revision,payload_cifrado FROM grafo_par_snapshot ON CONFLICT DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM grafo_par_snapshot s JOIN grafo_par_historia h USING(owner,revision)
           WHERE s.payload_cifrado IS DISTINCT FROM h.payload_cifrado) THEN
  RAISE EXCEPTION 'graph_history_revision_conflict';
 END IF;
END; $$;
CREATE OR REPLACE FUNCTION impedir_mutacion_historia_grafo_par() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'grafo_par_historia is append-only'; END;
$$;
DROP TRIGGER IF EXISTS grafo_par_historia_inmutable ON grafo_par_historia;
CREATE TRIGGER grafo_par_historia_inmutable BEFORE UPDATE OR DELETE ON grafo_par_historia
 FOR EACH ROW EXECUTE FUNCTION impedir_mutacion_historia_grafo_par();
DROP TRIGGER IF EXISTS grafo_par_snapshot_archivar ON grafo_par_snapshot;
CREATE TRIGGER grafo_par_snapshot_archivar BEFORE INSERT OR UPDATE ON grafo_par_snapshot
 FOR EACH ROW EXECUTE FUNCTION guardar_historia_grafo_par();
