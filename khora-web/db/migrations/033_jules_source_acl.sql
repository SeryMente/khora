-- Jules access is resource-scoped and stored outside exposed application schemas.
CREATE SCHEMA IF NOT EXISTS khora_private;
REVOKE ALL ON SCHEMA khora_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS khora_private.jules_source_acl (
  id bigserial PRIMARY KEY,
  subject text NOT NULL CHECK (subject = btrim(subject) AND length(subject) BETWEEN 1 AND 320),
  source text NOT NULL CHECK (
    source ~ '^sources/[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$'
    AND source !~ '(^|/)\.\.?(/|$)'
  ),
  branch text NOT NULL CHECK (length(branch) BETWEEN 1 AND 255 AND branch = btrim(branch)),
  read_allowed boolean NOT NULL DEFAULT false,
  write_allowed boolean NOT NULL DEFAULT false,
  granted_by text NOT NULL CHECK (granted_by = btrim(granted_by) AND length(granted_by) BETWEEN 1 AND 320),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by text,
  CHECK (read_allowed OR write_allowed),
  CHECK ((revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS jules_source_acl_active_unique
  ON khora_private.jules_source_acl(subject, source, branch)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS jules_source_acl_subject_active
  ON khora_private.jules_source_acl(subject, source, branch)
  WHERE revoked_at IS NULL;

REVOKE ALL ON TABLE khora_private.jules_source_acl FROM PUBLIC;
REVOKE ALL ON SEQUENCE khora_private.jules_source_acl_id_seq FROM PUBLIC;

-- Runtime ACL lookup runs exclusively through KHORA_READONLY_DATABASE_URL.
-- The deployed URL must authenticate as the verified, least-privilege role.
GRANT USAGE ON SCHEMA khora_private TO khora_lector;
GRANT SELECT ON TABLE khora_private.jules_source_acl TO khora_lector;
