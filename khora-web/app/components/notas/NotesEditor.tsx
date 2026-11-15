"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Check, CheckCheck, Circle, Copy, ListChecks, Pin, PinOff, Plus, RotateCcw, StickyNote, Trash2, X } from "lucide-react";
import { convertNoteMode, deriveTitle, normalizeChecklistItems, toPlainText } from "@/lib/notes/domain";
import { NOTE_COLORS, type ChecklistItem, type Note, type NoteDraft, type NoteMode } from "@/lib/notes/types";
import { SafeMarkdown } from "@/lib/notes/markdown";
import { useNotesRuntime } from "./NotesProvider";

type Props = {
  note: Note | null;
  onClose: () => void;
  onSaved: (note: Note) => void;
  onAction: (note: Note, action: "archive" | "trash" | "restore" | "pin" | "unpin") => Promise<boolean>;
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

const newItem = (position: number): ChecklistItem => ({
  id: crypto.randomUUID(),
  text: "",
  is_completed: false,
  position,
});

export default function NotesEditor({ note, onClose, onSaved, onAction }: Props) {
  const runtime = useNotesRuntime();
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    mode: note?.mode ?? "text",
    content: note?.content ?? "",
    checklist_items: note?.checklist_items ?? [],
    color: note?.color ?? "default",
    is_pinned: note?.is_pinned ?? false,
    context_type: note?.context_type ?? null,
    context_id: note?.context_id ?? null,
    context_url: note?.context_url ?? null,
  }));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<Note | null>(note);
  const [workingAction, setWorkingAction] = useState("");
  const [revision, setRevision] = useState(0);
  const draftRef = useRef(draft);
  const revisionRef = useRef(0);
  const noteIdRef = useRef(note?.id ?? null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const itemRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const savePromiseRef = useRef<Promise<boolean> | null>(null);

  const title = useMemo(() => deriveTitle(draft.content, draft.checklist_items), [draft.content, draft.checklist_items]);

  const changeDraft = useCallback((patch: Partial<NoteDraft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setSaveState("unsaved");
    setSaveError("");
    setDraft(next);
    setRevision((value) => value + 1);
  }, []);

  const persist = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return savePromiseRef.current ?? false;
    const current = draftRef.current;
    const hasContent = current.content.trim().length > 0 || current.checklist_items.some((item) => item.text.trim().length > 0);
    if (!noteIdRef.current && !hasContent) return true;
    if (!dirtyRef.current && noteIdRef.current) return true;

    savingRef.current = true;
    setSaveState("saving");
    setSaveError("");
    const request = (async () => {
      try {
        const url = noteIdRef.current ? "/api/notes/" + noteIdRef.current : "/api/notes";
        const response = await fetch(url, {
          method: noteIdRef.current ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(current),
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const body = await response.json();
        const saved = body.note as Note;
        noteIdRef.current = saved.id;
        dirtyRef.current = false;
        setSavedNote(saved);
        setSaveState("saved");
        onSaved(saved);
        window.dispatchEvent(new Event("khora:notes-changed"));
        return true;
      } catch {
        setSaveState("error");
        setSaveError("No se pudo guardar. El contenido sigue disponible; reintenta el guardado.");
        return false;
      } finally {
        savingRef.current = false;
        savePromiseRef.current = null;
      }
    })();
    savePromiseRef.current = request;
    return request;
  }, [onSaved]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = window.setTimeout(() => { void persist(); }, 500);
    return () => window.clearTimeout(timer);
  }, [revision, persist]);

  const closeEditor = useCallback(async () => {
    const saved = await persist();
    if (saved) onClose();
  }, [onClose, persist]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        void closeEditor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeEditor]);

  async function getFreshSavedNote(): Promise<Note | null> {
    if (!await persist() || !noteIdRef.current) return null;
    const response = await fetch("/api/notes/" + noteIdRef.current, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo recuperar la nota guardada.");
    const fresh = (await response.json()).note as Note;
    setSavedNote(fresh);
    return fresh;
  }

  async function runNoteAction(action: "archive" | "trash" | "restore") {
    if (workingAction) return;
    setWorkingAction(action);
    try {
      const current = await getFreshSavedNote();
      if (!current) return;
      const succeeded = await onAction(current, action);
      if (succeeded) onClose();
      else setSaveError("La acción no se completó. La nota permanece disponible.");
    } catch {
      setSaveError("La acción no se completó. La nota permanece guardada.");
    } finally {
      setWorkingAction("");
    }
  }

  async function runQuickAction(actionId: string) {
    if (!savedNote || workingAction) return;
    setWorkingAction(actionId);
    try {
      const current = await getFreshSavedNote();
      if (!current) return;
      if (actionId === "copy-archive") {
        await navigator.clipboard.writeText(toPlainText(current));
        const succeeded = await onAction(current, "archive");
        if (succeeded) onClose();
        else setSaveError("Se copió el texto, pero no se pudo archivar la nota.");
        return;
      }
      const extension = runtime.quickActions.find((action) => action.id === actionId);
      if (!extension) return;
      await extension.run(current);
      if (extension.autoArchiveOnSuccess) {
        const succeeded = await onAction(current, "archive");
        if (succeeded) onClose();
        else setSaveError("La acción se ejecutó, pero no se pudo archivar la nota.");
      }
    } catch {
      setSaveError("La acción no se completó. La nota permanece guardada.");
    } finally {
      setWorkingAction("");
    }
  }
  function switchMode(nextMode: NoteMode) {
    const converted = convertNoteMode(draftRef.current, nextMode);
    changeDraft(converted);
  }

  function updateChecklistItem(id: string, patch: Partial<ChecklistItem>) {
    changeDraft({
      checklist_items: normalizeChecklistItems(draftRef.current.checklist_items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      )),
    });
  }

  function focusItem(id: string) {
    window.requestAnimationFrame(() => itemRefs.current[id]?.focus());
  }

  function insertBelow(index: number) {
    const items = normalizeChecklistItems(draftRef.current.checklist_items);
    const item = newItem(index + 1);
    items.splice(index + 1, 0, item);
    changeDraft({ checklist_items: normalizeChecklistItems(items) });
    focusItem(item.id);
  }

  function removeEmptyItem(index: number) {
    const items = normalizeChecklistItems(draftRef.current.checklist_items);
    if (items[index]?.text.trim() || items.length <= 1 || index <= 0) return false;
    const previousId = items[index - 1].id;
    items.splice(index, 1);
    changeDraft({ checklist_items: normalizeChecklistItems(items) });
    focusItem(previousId);
    return true;
  }

  const incomplete = draft.checklist_items.filter((item) => !item.is_completed).sort((a, b) => a.position - b.position);
  const completed = draft.checklist_items.filter((item) => item.is_completed).sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/45 sm:items-center sm:p-6" onMouseDown={(event) => {
      if (event.target === event.currentTarget) void closeEditor();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-editor-title"
        className="flex h-full w-full flex-col overflow-hidden border shadow-2xl sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl"
        style={{ background: "var(--khora-surface)", color: "var(--khora-ink)", borderColor: "var(--khora-border)" }}
      >
        <header className="flex items-center justify-between gap-3 border-b p-3 sm:p-4" style={{ borderColor: "var(--khora-border)" }}>
          <div className="min-w-0">
            <h2 id="notes-editor-title" className="truncate font-semibold">{title}</h2>
            <p aria-live="polite" className="text-xs opacity-60">
              {saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : saveState === "error" ? "Error de guardado" : saveState === "unsaved" ? "Cambios sin guardar" : note ? "Editando nota" : "Nueva nota"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {saveState === "error" && <button type="button" aria-label="Reintentar guardado" onClick={() => void persist()} className="min-h-11 min-w-11 rounded-lg"><RotateCcw className="mx-auto" size={18} /></button>}
            <button type="button" aria-label="Cerrar editor" onClick={() => void closeEditor()} className="min-h-11 min-w-11 rounded-lg hover:bg-black/5"><X className="mx-auto" size={20} /></button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b p-3" style={{ borderColor: "var(--khora-border)" }}>
          <button type="button" onClick={() => switchMode("text")} aria-pressed={draft.mode === "text"} className="min-h-11 rounded-lg border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
            <StickyNote className="mr-2 inline" size={16} />Texto
          </button>
          <button type="button" onClick={() => switchMode("checklist")} aria-pressed={draft.mode === "checklist"} className="min-h-11 rounded-lg border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
            <ListChecks className="mr-2 inline" size={16} />Checklist
          </button>
          <span className="mx-1 h-7 w-px" style={{ background: "var(--khora-border)" }} />
          <div className="flex items-center gap-1" aria-label="Color de nota">
            {NOTE_COLORS.map((color) => (
              <button key={color} type="button" aria-label={"Color " + color} aria-pressed={draft.color === color} onClick={() => changeDraft({ color })} className="min-h-11 min-w-11 rounded-full border-2" data-note-color={color} style={{ borderColor: draft.color === color ? "var(--khora-accent)" : "var(--khora-border)" }} />
            ))}
          </div>
          <button type="button" aria-label={draft.is_pinned ? "Desfijar nota" : "Fijar nota"} aria-pressed={draft.is_pinned} onClick={() => changeDraft({ is_pinned: !draft.is_pinned })} className="ml-auto min-h-11 min-w-11 rounded-lg">
            {draft.is_pinned ? <PinOff className="mx-auto" size={18} /> : <Pin className="mx-auto" size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <input
            aria-label="Título automático de la nota"
            readOnly
            value={title}
            className="mb-4 w-full border-0 bg-transparent text-lg font-semibold outline-none"
          />
          {draft.mode === "text" ? (
            <textarea
              aria-label="Contenido de la nota"
              value={draft.content}
              onChange={(event) => changeDraft({ content: event.target.value })}
              onBlur={() => { if (dirtyRef.current) void persist(); }}
              placeholder="Escribe una nota… usa **negritas**, *cursivas*, `código` o #etiquetas"
              className="min-h-[45vh] w-full resize-y border-0 bg-transparent text-base leading-7 outline-none"
              autoFocus
            />
          ) : (
            <div className="space-y-2">
              {incomplete.map((item) => {
                const index = draft.checklist_items.findIndex((entry) => entry.id === item.id);
                return (
                  <div key={item.id} className="flex items-start gap-2">
                    <button type="button" aria-label={item.is_completed ? "Marcar pendiente" : "Completar elemento"} aria-pressed={item.is_completed} onClick={() => updateChecklistItem(item.id, { is_completed: !item.is_completed })} className="mt-1 min-h-11 min-w-11 rounded-lg">
                      {item.is_completed ? <CheckCheck className="mx-auto" size={18} /> : <Circle className="mx-auto" size={18} />}
                    </button>
                    <textarea
                      ref={(element) => { itemRefs.current[item.id] = element; }}
                      aria-label={"Elemento " + (index + 1)}
                      rows={1}
                      value={item.text}
                      onChange={(event) => updateChecklistItem(item.id, { text: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") { event.preventDefault(); insertBelow(index); }
                        if (event.key === "Backspace" && !item.text && removeEmptyItem(index)) event.preventDefault();
                      }}
                      className="min-h-11 flex-1 resize-none border-b bg-transparent px-2 py-2 text-base outline-none"
                      style={{ borderColor: "var(--khora-border)" }}
                    />
                  </div>
                );
              })}
              <button type="button" onClick={() => {
                const item = newItem(draft.checklist_items.length);
                changeDraft({ checklist_items: [...draft.checklist_items, item] });
                focusItem(item.id);
              }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm opacity-70 hover:opacity-100">
                <Plus size={17} />Añadir elemento
              </button>
              {completed.length > 0 && (
                <div className="mt-5 border-t pt-3" style={{ borderColor: "var(--khora-border)" }}>
                  <button type="button" aria-expanded={completedOpen} onClick={() => setCompletedOpen((value) => !value)} className="flex min-h-11 items-center gap-2 text-sm opacity-70">
                    <Check size={16} />Completados ({completed.length}) {completedOpen ? "−" : "+"}
                  </button>
                  {completedOpen && completed.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <button type="button" aria-label="Restaurar elemento pendiente" onClick={() => updateChecklistItem(item.id, { is_completed: false })} className="min-h-11 min-w-11 rounded-lg"><CheckCheck className="mx-auto" size={18} /></button>
                      <textarea ref={(element) => { itemRefs.current[item.id] = element; }} aria-label="Elemento completado" rows={1} value={item.text} onChange={(event) => updateChecklistItem(item.id, { text: event.target.value })} className="min-h-11 flex-1 resize-none border-b bg-transparent px-2 py-2 text-base line-through opacity-60 outline-none" style={{ borderColor: "var(--khora-border)" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {draft.mode === "text" && draft.content.trim() && (
            <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--khora-border)" }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-50">Vista previa</p>
              <SafeMarkdown content={draft.content} />
            </div>
          )}
          {saveError && <p role="alert" className="mt-4 text-sm text-red-600">{saveError}</p>}
          <p className="mt-4 text-xs opacity-50">Las etiquetas se extraen del contenido y de los elementos de checklist.</p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t p-3" style={{ borderColor: "var(--khora-border)" }}>
          <div className="flex flex-wrap gap-1">
            {savedNote && (
              <>
                <button type="button" title="Copiar texto y archivar" aria-label="Copiar texto y archivar" onClick={() => void runQuickAction("copy-archive")} disabled={Boolean(workingAction)} className="min-h-11 min-w-11 rounded-lg">
                  <Copy className="mx-auto" size={18} />
                </button>
                <button type="button" title={savedNote.status === "archived" ? "Restaurar a activas" : "Archivar"} aria-label={savedNote.status === "archived" ? "Restaurar a activas" : "Archivar nota"} onClick={() => void runNoteAction(savedNote.status === "archived" ? "restore" : "archive")} className="min-h-11 min-w-11 rounded-lg"><Archive className="mx-auto" size={18} /></button>
                <button type="button" title="Enviar a papelera" aria-label="Enviar a papelera" onClick={() => void runNoteAction("trash")} className="min-h-11 min-w-11 rounded-lg"><Trash2 className="mx-auto" size={18} /></button>
              </>
            )}
            {runtime.quickActions.map((action) => (
              <button key={action.id} type="button" onClick={() => void runQuickAction(action.id)} disabled={!savedNote || Boolean(workingAction)} className="min-h-11 rounded-lg border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
                {workingAction === action.id ? "Ejecutando…" : action.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void closeEditor()} className="min-h-11 rounded-xl px-5 font-semibold" style={{ background: "var(--khora-accent)", color: "var(--khora-surface)" }}>
            {saveState === "saving" ? "Guardando…" : "Cerrar"}
          </button>
        </footer>
      </section>
    </div>
  );
}
