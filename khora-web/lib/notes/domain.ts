import type { ChecklistItem, Note, NoteDraft, NoteMode } from "./types";

const TAG_TOKEN = /(^|[^\p{L}\p{N}_-])#([\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*)/gu;

function cleanTagPath(raw: string): string | null {
  const normalized = raw.normalize("NFKC").toLocaleLowerCase("es-MX");
  const segments = normalized.split("/");
  if (segments.some((segment) => !/^[\p{L}\p{N}_-]+$/u.test(segment))) return null;
  if (segments.length > 1 && segments.length < 3) return null;
  return segments.join("/");
}

export function extractTags(...sources: string[]): string[] {
  const tags = new Set<string>();
  for (const source of sources) {
    TAG_TOKEN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG_TOKEN.exec(source)) !== null) {
      const tag = cleanTagPath(match[2]);
      if (tag) tags.add(tag);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "es"));
}

export function tagsForNote(content: string, items: ChecklistItem[]): string[] {
  return extractTags(content, ...items.map((item) => item.text));
}

export function deriveTitle(content: string, items: ChecklistItem[] = [], maxLength = 60): string {
  const firstContentLine = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  const firstItem = [...items].sort((a, b) => a.position - b.position).find((item) => item.text.trim())?.text.trim();
  const source = firstContentLine || firstItem || "Nota rápida";
  return source.length > maxLength ? source.slice(0, maxLength - 1).trimEnd() + "…" : source;
}

export function normalizeChecklistItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => a.position - b.position).map((item, position) => ({ ...item, position }));
}

export function serializeChecklist(items: ChecklistItem[]): string {
  return normalizeChecklistItems(items).map((item) => `[${item.is_completed ? "x" : " "}] ${item.text}`).join("\n");
}

function makeItem(text: string, isCompleted: boolean, position: number): ChecklistItem {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `item-${Date.now().toString(36)}-${position}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, text, is_completed: isCompleted, position };
}

export function textToChecklist(content: string): ChecklistItem[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const meaningful = lines.length === 1 && lines[0] === "" ? [""] : lines;
  return meaningful.map((line, position) => {
    const match = line.match(/^\s*\[([ xX])\]\s?(.*)$/);
    return makeItem(match ? match[2] : line, Boolean(match && match[1].toLowerCase() === "x"), position);
  });
}

export function convertNoteMode(draft: NoteDraft, mode: NoteMode): NoteDraft {
  if (draft.mode === mode) return { ...draft, checklist_items: normalizeChecklistItems(draft.checklist_items) };
  if (mode === "checklist") {
    const checklist_items = textToChecklist(draft.content);
    return { ...draft, mode, checklist_items, content: serializeChecklist(checklist_items) };
  }
  return { ...draft, mode, content: serializeChecklist(draft.checklist_items), checklist_items: [] };
}

export function toPlainText(note: Pick<Note, "mode" | "content" | "checklist_items">): string {
  return note.mode === "checklist" ? serializeChecklist(note.checklist_items) : note.content;
}

export interface TagNode { name: string; path: string; children: TagNode[]; }
export function buildTagTree(tags: string[]): TagNode[] {
  const root = new Map<string, { name: string; path: string; children: Map<string, any> }>();
  for (const tag of tags) {
    const parts = tag.split("/");
    let level = root;
    let path = "";
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      if (!level.has(part)) level.set(part, { name: part, path, children: new Map() });
      level = level.get(part)!.children;
    }
  }
  const materialize = (nodes: typeof root): TagNode[] =>
    [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((node) => ({ name: node.name, path: node.path, children: materialize(node.children) }));
  return materialize(root);
}
