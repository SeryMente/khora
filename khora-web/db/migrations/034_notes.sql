-- Additive storage for Quick Notes. No existing table or row is changed.
-- The dedicated migration runner wraps this file in a PostgreSQL transaction.

CREATE TABLE IF NOT EXISTS public.khora_notes (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL CHECK (user_id = btrim(user_id) AND length(user_id) BETWEEN 1 AND 320),
  mode TEXT NOT NULL CHECK (mode IN ('text', 'checklist')),
  content TEXT NOT NULL DEFAULT '',
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(checklist_items) = 'array'),
  tags TEXT[] NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT 'default' CHECK (color IN ('default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'trashed')),
  context_type TEXT,
  context_id TEXT,
  context_url TEXT,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'trashed' AND trashed_at IS NOT NULL)
    OR (status <> 'trashed' AND trashed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS khora_notes_user_status_pin_updated_idx
  ON public.khora_notes (user_id, status, is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS khora_notes_tags_gin_idx
  ON public.khora_notes USING GIN (tags);

CREATE INDEX IF NOT EXISTS khora_notes_context_idx
  ON public.khora_notes (user_id, context_type, context_id)
  WHERE context_type IS NOT NULL OR context_id IS NOT NULL;

REVOKE ALL ON TABLE public.khora_notes FROM PUBLIC;
