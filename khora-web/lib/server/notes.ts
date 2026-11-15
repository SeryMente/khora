import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./neon";
import { convertNoteMode, extractTags, normalizeChecklistItems } from "../notes/domain";
import type { ChecklistItem, Note, NoteColor, NoteDraft, NoteStatus } from "../notes/types";

const itemSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().max(20_000),
  is_completed: z.boolean(),
  position: z.number().int().nonnegative(),
});

const noteDraftBaseSchema = z.object({
  mode: z.enum(["text", "checklist"]),
  content: z.string().max(100_000),
  checklist_items: z.array(itemSchema).max(500),
  color: z.enum(["default", "red", "orange", "yellow", "green", "blue", "purple"]).default("default"),
  is_pinned: z.boolean().default(false),
  context_type: z.string().trim().min(1).max(100).nullable().optional(),
  context_id: z.string().trim().min(1).max(500).nullable().optional(),
  context_url: z.string().url().max(2_000).nullable().optional(),
});

function validateContextUrl(value: string | null | undefined, ctx: z.RefinementCtx) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsafe");
  } catch {
    ctx.addIssue({ code: "custom", path: ["context_url"], message: "El contexto debe usar HTTP o HTTPS." });
  }
}

export const noteDraftSchema = noteDraftBaseSchema.superRefine((draft, ctx) => {
  if (draft.mode === "text" && draft.checklist_items.length > 0) {
    ctx.addIssue({ code: "custom", path: ["checklist_items"], message: "Las notas de texto no almacenan elementos de checklist." });
  }
  validateContextUrl(draft.context_url, ctx);
});

export const notePatchSchema = noteDraftBaseSchema.partial().superRefine((draft, ctx) => {
  if (Object.keys(draft).length === 0) {
    ctx.addIssue({ code: "custom", message: "No hay cambios para guardar." });
  }
  if (draft.mode === "text" && (draft.checklist_items?.length ?? 0) > 0) {
    ctx.addIssue({ code: "custom", path: ["checklist_items"], message: "Las notas de texto no almacenan elementos de checklist." });
  }
  validateContextUrl(draft.context_url, ctx);
});

export const noteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(40),
  status: z.enum(["active", "archived", "trashed", "all"]).default("active"),
  q: z.string().trim().max(300).default(""),
  tag: z.string().trim().max(300).regex(/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u).optional(),
  context_type: z.string().trim().max(100).optional(),
  context_id: z.string().trim().max(500).optional(),
});

export type NoteListFilters = z.infer<typeof noteListQuerySchema>;

function normalizeRow(row: any): Note {
  const items = normalizeChecklistItems(Array.isArray(row.checklist_items) ? row.checklist_items as ChecklistItem[] : []);
  const content = String(row.content ?? "");
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    mode: row.mode === "checklist" ? "checklist" : "text",
    content,
    checklist_items: items,
    tags: extractTags(content, ...items.map((item) => item.text)),
    color: (["default", "red", "orange", "yellow", "green", "blue", "purple"].includes(row.color) ? row.color : "default") as NoteColor,
    is_pinned: row.is_pinned === true,
    status: row.status as NoteStatus,
    context_type: row.context_type ?? null,
    context_id: row.context_id ?? null,
    context_url: row.context_url ?? null,
    trashed_at: row.trashed_at ? new Date(row.trashed_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function noteValues(draft: NoteDraft) {
  const items = draft.mode === "checklist" ? normalizeChecklistItems(draft.checklist_items) : [];
  const content = draft.mode === "checklist" ? "" : draft.content;
  const tags = extractTags(content, ...items.map((item) => item.text));
  return {
    content,
    items: JSON.stringify(items),
    tags,
    color: draft.color,
    pinned: draft.is_pinned,
    contextType: draft.context_type ?? null,
    contextId: draft.context_id ?? null,
    contextUrl: draft.context_url ?? null,
  };
}

export async function listNotes(userId: string, filters: NoteListFilters) {
  const db = getDb();
  const where: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];
  const bind = (value: unknown) => {
    params.push(value);
    return "$" + params.length;
  };

  if (filters.status !== "all") where.push("status = " + bind(filters.status));
  if (filters.q) {
    const term = "%" + filters.q.replace(/[!%_]/g, (character) => "!" + character) + "%";
    const p = bind(term);
    where.push("(content ILIKE " + p + " ESCAPE '!' OR checklist_items::text ILIKE " + p + " ESCAPE '!' OR array_to_string(tags, ' ') ILIKE " + p + " ESCAPE '!')");
  }
  if (filters.tag) {
    const tag = filters.tag.toLocaleLowerCase("es-MX");
    const p = bind(tag);
    where.push("(tags @> ARRAY[" + p + "]::text[] OR EXISTS (SELECT 1 FROM unnest(tags) AS tag_value WHERE left(tag_value, char_length(" + p + ") + 1) = " + p + " || '/'))");
  }  if (filters.context_type) where.push("context_type = " + bind(filters.context_type));
  if (filters.context_id) where.push("context_id = " + bind(filters.context_id));

  const clause = where.join(" AND ");
  const count = await db.query("SELECT count(*)::int AS total FROM khora_notes WHERE " + clause, params);
  const pageParams = [...params, filters.pageSize, (filters.page - 1) * filters.pageSize];
  const rows = await db.query(
    "SELECT * FROM khora_notes WHERE " + clause +
      " ORDER BY CASE WHEN status = 'active' AND is_pinned THEN 0 ELSE 1 END, updated_at DESC " +
      "LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2),
    pageParams,
  );
  const tagWhere: string[] = ["user_id = $1"];
  const tagParams: unknown[] = [userId];
  if (filters.status !== "all") {
    tagParams.push(filters.status);
    tagWhere.push("status = $" + tagParams.length);
  }
  if (filters.context_type) {
    tagParams.push(filters.context_type);
    tagWhere.push("context_type = $" + tagParams.length);
  }
  if (filters.context_id) {
    tagParams.push(filters.context_id);
    tagWhere.push("context_id = $" + tagParams.length);
  }
  const tagRows = await db.query(
    "SELECT DISTINCT unnest(tags) AS tag FROM khora_notes WHERE " + tagWhere.join(" AND ") + " ORDER BY tag",
    tagParams,
  );
  const allTags = tagRows.rows.map((row: any) => String(row.tag));
  const total = Number(count.rows[0]?.total ?? 0);
  return {
    items: rows.rows.map(normalizeRow),
    tags: allTags,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    hasMore: filters.page * filters.pageSize < total,
  };
}

export async function getNote(userId: string, id: string): Promise<Note | null> {
  const result = await getDb().query(
    "SELECT * FROM khora_notes WHERE id = $1 AND user_id = $2 LIMIT 1",
    [id, userId],
  );
  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
}

export async function createNote(userId: string, draft: NoteDraft): Promise<Note> {
  const values = noteValues(draft);
  const id = randomUUID();
  const result = await getDb().query(
    `INSERT INTO khora_notes
      (id, user_id, mode, content, checklist_items, tags, color, is_pinned, context_type, context_id, context_url)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::text[], $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, userId, draft.mode, values.content, values.items, values.tags, values.color, values.pinned, values.contextType, values.contextId, values.contextUrl],
  );
  return normalizeRow(result.rows[0]);
}

export async function updateNote(userId: string, id: string, patch: Partial<NoteDraft>): Promise<Note | null> {
  const current = await getNote(userId, id);
  if (!current) return null;
  const draft: NoteDraft = {
    mode: current.mode,
    content: patch.content ?? current.content,
    checklist_items: patch.checklist_items ?? current.checklist_items,
    color: patch.color ?? current.color,
    is_pinned: patch.is_pinned ?? current.is_pinned,
    context_type: patch.context_type === undefined ? current.context_type : patch.context_type,
    context_id: patch.context_id === undefined ? current.context_id : patch.context_id,
    context_url: patch.context_url === undefined ? current.context_url : patch.context_url,
  };
  const effectiveDraft = patch.mode && patch.mode !== current.mode && patch.content === undefined && patch.checklist_items === undefined
    ? convertNoteMode(draft, patch.mode)
    : { ...draft, mode: patch.mode ?? current.mode };  const values = noteValues(effectiveDraft);
  const result = await getDb().query(
    `UPDATE khora_notes SET mode=$3, content=$4, checklist_items=$5::jsonb, tags=$6::text[],
      color=$7, is_pinned=$8, context_type=$9, context_id=$10, context_url=$11, updated_at=now()
     WHERE id=$1 AND user_id=$2 AND status <> 'trashed' RETURNING *`,
    [id, userId, effectiveDraft.mode, values.content, values.items, values.tags, values.color, values.pinned, values.contextType, values.contextId, values.contextUrl],
  );
  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
}

export type NoteAction = "archive" | "trash" | "restore" | "pin" | "unpin";

export async function applyNoteAction(userId: string, id: string, action: NoteAction): Promise<Note | null> {
  const assignments: Record<NoteAction, string> = {
    archive: "status='archived', trashed_at=NULL, updated_at=now()",
    trash: "status='trashed', trashed_at=now(), updated_at=now()",
    restore: "status='active', trashed_at=NULL, updated_at=now()",
    pin: "is_pinned=true, updated_at=now()",
    unpin: "is_pinned=false, updated_at=now()",
  };
  const where = action === "restore" ? "status IN ('trashed','archived')" : action === "pin" || action === "unpin" ? "status='active'" : "status <> 'trashed'";
  const result = await getDb().query(
    "UPDATE khora_notes SET " + assignments[action] + " WHERE id=$1 AND user_id=$2 AND " + where + " RETURNING *",
    [id, userId],
  );
  return result.rows[0] ? normalizeRow(result.rows[0]) : null;
}

export async function permanentlyDeleteNote(userId: string, id: string): Promise<boolean> {
  const result = await getDb().query(
    "DELETE FROM khora_notes WHERE id=$1 AND user_id=$2 AND status='trashed'",
    [id, userId],
  );
  return Number(result.rowCount ?? 0) === 1;
}
