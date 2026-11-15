"use client";

import { Archive, Pin, PinOff, Trash2 } from "lucide-react";
import { deriveTitle } from "@/lib/notes/domain";
import { SafeMarkdown } from "@/lib/notes/markdown";
import type { Note } from "@/lib/notes/types";

export default function NoteCard({
  note,
  onOpen,
  onAction,
  onDelete,
  list = false,
}: {
  note: Note;
  onOpen: (note: Note) => void;
  onAction: (note: Note, action: "archive" | "trash" | "restore" | "pin" | "unpin") => void;
  onDelete: (note: Note) => void;
  list?: boolean;
}) {
  const title = deriveTitle(note.content, note.checklist_items);
  const completed = note.checklist_items.filter((item) => item.is_completed).length;
  return (
    <article
      className={"group break-inside-avoid rounded-2xl border p-4 transition-shadow hover:shadow-md " + (list ? "flex flex-col sm:flex-row sm:items-start sm:gap-4" : "")}
      data-note-card={note.id}
      data-note-color={note.color}
      style={{ color: "var(--khora-ink)", borderColor: "var(--khora-border)" }}
    >
      <button type="button" onClick={() => onOpen(note)} className="min-w-0 flex-1 text-left">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold">{title}</h3>
          {note.is_pinned && <Pin size={15} className="shrink-0 opacity-60" aria-label="Fijada" />}
        </div>
        {note.mode === "text" ? (
          <p className="line-clamp-6 whitespace-pre-wrap break-words text-sm opacity-80"><SafeMarkdown content={note.content} /></p>
        ) : (
          <div className="space-y-1">
            {note.checklist_items.filter((item) => !item.is_completed).slice(0, 4).map((item) => (
              <p key={item.id} className="flex gap-2 text-sm"><span aria-hidden="true">○</span><span className="line-clamp-1">{item.text}</span></p>
            ))}
            <p className="pt-1 text-xs opacity-55">{completed}/{note.checklist_items.length} completados</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full px-2 py-1 text-[11px]" style={{ background: "var(--khora-bg, rgba(127,127,127,.12))" }}>#{tag}</span>
          ))}
        </div>
      </button>
      <div className="mt-3 flex shrink-0 items-center gap-1 sm:mt-0">
        {note.status === "trashed" ? (
          <>
            <button type="button" aria-label="Restaurar nota" title="Restaurar" onClick={() => onAction(note, "restore")} className="min-h-11 min-w-11 rounded-lg hover:bg-black/5"><Archive className="mx-auto" size={17} /></button>
            <button type="button" aria-label="Eliminar permanentemente" title="Eliminar permanentemente" onClick={() => onDelete(note)} className="min-h-11 min-w-11 rounded-lg text-red-600 hover:bg-black/5"><Trash2 className="mx-auto" size={17} /></button>
          </>
        ) : (
          <>
            <button type="button" aria-label={note.is_pinned ? "Desfijar" : "Fijar"} title={note.is_pinned ? "Desfijar" : "Fijar"} onClick={() => onAction(note, note.is_pinned ? "unpin" : "pin")} className="min-h-11 min-w-11 rounded-lg opacity-65 hover:bg-black/5 hover:opacity-100">{note.is_pinned ? <PinOff className="mx-auto" size={17} /> : <Pin className="mx-auto" size={17} />}</button>
            <button type="button" aria-label={note.status === "archived" ? "Restaurar a activas" : "Archivar"} title={note.status === "archived" ? "Restaurar" : "Archivar"} onClick={() => onAction(note, note.status === "archived" ? "restore" : "archive")} className="min-h-11 min-w-11 rounded-lg opacity-65 hover:bg-black/5 hover:opacity-100"><Archive className="mx-auto" size={17} /></button>
            <button type="button" aria-label="Enviar a papelera" title="Papelera" onClick={() => onAction(note, "trash")} className="min-h-11 min-w-11 rounded-lg opacity-65 hover:bg-black/5 hover:opacity-100"><Trash2 className="mx-auto" size={17} /></button>
          </>
        )}
      </div>
    </article>
  );
}
