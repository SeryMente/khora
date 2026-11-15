export const NOTE_COLORS = ["default", "red", "orange", "yellow", "green", "blue", "purple"] as const;
export type NoteMode = "text" | "checklist";
export type NoteStatus = "active" | "archived" | "trashed";
export type NoteColor = (typeof NOTE_COLORS)[number];
export interface ChecklistItem { id: string; text: string; is_completed: boolean; position: number; }
export interface Note {
  id: string; user_id: string; mode: NoteMode; content: string; checklist_items: ChecklistItem[];
  tags: string[]; color: NoteColor; is_pinned: boolean; status: NoteStatus;
  context_type: string | null; context_id: string | null; context_url: string | null;
  trashed_at: string | null; created_at: string; updated_at: string;
}
export interface NoteContext { type: string; id: string; url?: string | null; }
export interface NotesContextAdapter { getCurrentContext(): NoteContext | null | Promise<NoteContext | null>; }
export interface NoteDraft {
  mode: NoteMode; content: string; checklist_items: ChecklistItem[]; color: NoteColor; is_pinned: boolean;
  context_type?: string | null; context_id?: string | null; context_url?: string | null;
}
export interface NotesPage { items: Note[]; tags: string[]; page: number; pageSize: number; total: number; hasMore: boolean; }
export interface QuickAction { id: string; label: string; autoArchiveOnSuccess?: boolean; run(note: Note): Promise<void>; }
