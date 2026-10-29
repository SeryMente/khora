-- Additive. Run only by the verified write-role administrator; never from MCP reads/startup.
-- Source custody remains volcado/volcado_version. No raw source column is introduced.
BEGIN;
CREATE TABLE IF NOT EXISTS blog_editorial (
  id uuid PRIMARY KEY, owner text NOT NULL, volcado_id uuid NOT NULL REFERENCES volcado(id),
  kind text NOT NULL CHECK(kind IN ('blog_personal','conversacion_maya','interpretacion_simultanea','general')),
  obfuscated boolean NOT NULL DEFAULT false,
  revision integer NOT NULL CHECK(revision>0),
  payload_cipher text NOT NULL, approval_cipher text,
  export_snapshot jsonb, approved_digest char(64), ever_approved boolean NOT NULL DEFAULT false,
  consent text NOT NULL DEFAULT 'pending' CHECK(consent IN ('pending','declined','approved')),
  changed_seq bigint GENERATED ALWAYS AS IDENTITY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner,volcado_id)
);
CREATE INDEX IF NOT EXISTS blog_owner_changes ON blog_editorial(owner,changed_seq);
CREATE TABLE IF NOT EXISTS blog_editorial_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  editorial_id uuid NOT NULL REFERENCES blog_editorial(id), owner text NOT NULL,
  revision integer NOT NULL, action text NOT NULL,
  payload_cipher text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blog_delivery (
  editorial_id uuid NOT NULL REFERENCES blog_editorial(id), revision integer NOT NULL,
  target text NOT NULL CHECK(target IN ('blog','facebook')), digest char(64) NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','submitting','unknown','confirmed','blocked','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  external_id text, url text, proof_hash char(64), last_code text, lease_until timestamptz, lease_token uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(editorial_id,revision,target)
);
-- A read-role can be granted SELECT on this view only by the verified administrator.
-- It contains approved public projections or opaque tombstones, never draft/source ciphers.
CREATE OR REPLACE VIEW blog_public_export AS
 SELECT e.id, e.owner, e.revision, e.changed_seq,
   CASE WHEN e.consent='approved' THEN e.export_snapshot ELSE NULL END AS snapshot,
   CASE WHEN e.consent='approved' THEN e.approved_digest ELSE NULL END AS digest,
   e.consent<>'approved' AS withdrawn,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('target',d.target,'state',d.state,'url',d.url,'proofHash',d.proof_hash)) FROM blog_delivery d WHERE d.editorial_id=e.id AND d.revision=e.revision),'[]'::jsonb) AS deliveries
 FROM blog_editorial e WHERE e.kind='blog_personal' AND e.ever_approved=true;
CREATE TABLE IF NOT EXISTS blog_publication_refusal (
  publication_id uuid PRIMARY KEY, owner text NOT NULL,
  volcado_id uuid NOT NULL REFERENCES volcado(id), source_version integer NOT NULL,
  source_hash char(64) NOT NULL, obfuscated boolean,
  created_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
  UNIQUE(owner,volcado_id,source_version,source_hash)
);
CREATE TABLE IF NOT EXISTS blog_refusal_events (
  publication_id uuid NOT NULL, owner text NOT NULL, source_version integer NOT NULL,
  source_hash char(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(publication_id,owner,source_version,source_hash)
);
-- Refusal is private: never include this table in public export or broad read grants.
-- Do not grant readonly/global roles access to encrypted drafts or originals here.
COMMIT;
