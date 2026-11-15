"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid, List, Plus, Settings2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { Note, NoteStatus } from "@/lib/notes/types";
import NotesEditor from "./NotesEditor";
import NotesFilters from "./NotesFilters";
import NoteCard from "./NoteCard";
import { useNotesRuntime } from "./NotesProvider";

type ToastState = { noteId: string; message: string } | null;

export default function NotesWorkspace() {
  const runtime = useNotesRuntime();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [status, setStatus] = useState<NoteStatus>("active");
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [contextLabel, setContextLabel] = useState("");
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const loadNotes = useCallback(async (targetPage = 1, append = false) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: "40",
        status,
        q: query,
      });
      if (selectedTag) params.set("tag", selectedTag);
      const context = runtime.contextAdapter ? await runtime.contextAdapter.getCurrentContext() : null;
      if (context?.type) params.set("context_type", context.type);
      if (context?.id) params.set("context_id", context.id);
      setContextLabel(context ? context.type : "");
      const response = await fetch("/api/notes?" + params.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      setNotes((previous) => append ? [...previous, ...data.items] : data.items);
      setTags(Array.isArray(data.tags) ? data.tags : [...new Set((data.items as Note[]).flatMap((note) => note.tags))]);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setPage(targetPage);
    } catch {
      setError("No se pudieron cargar las notas. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [status, query, selectedTag, runtime.contextAdapter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadNotes(1, false); }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadNotes, query, status, selectedTag]);

  useEffect(() => {
    const refresh = () => { void loadNotes(1, false); };
    window.addEventListener("khora:notes-changed", refresh);
    return () => window.removeEventListener("khora:notes-changed", refresh);
  }, [loadNotes]);

  useEffect(() => {
    const selectedId = searchParams?.get("note");
    if (!selectedId) return;
    let cancelled = false;
    void fetch("/api/notes/" + encodeURIComponent(selectedId), { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data?.note) { setActiveNote(data.note); setEditorOpen(true); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [searchParams]);

  useEffect(() => {
    if (searchParams?.get("new") === "1") { setActiveNote(null); setEditorOpen(true); }
  }, [searchParams]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

function showUndo(note: Note, action: "archive" | "trash") {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ noteId: note.id, message: action === "archive" ? "Nota archivada" : "Nota enviada a papelera" });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }

  const handleAction = useCallback(async (
    note: Note,
    action: "archive" | "trash" | "restore" | "pin" | "unpin",
  ) => {
    try {
      const response = await fetch("/api/notes/" + note.id + "/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const body = await response.json();
      const updated = body.note as Note;
      setNotes((previous) => action === "trash" || (action === "archive" && status === "active") ||
        (action === "restore" && status !== "active")
        ? previous.filter((item) => item.id !== note.id)
        : previous.map((item) => item.id === note.id ? updated : item));
      if (activeNote?.id === note.id && (action === "archive" || action === "trash")) setActiveNote(null);
      if (action === "archive" || action === "trash") showUndo(note, action);
      else setToast(null);
      window.dispatchEvent(new Event("khora:notes-changed"));
      return true;
    } catch {
      setError("No se pudo completar la acción sobre la nota.");
      return false;
    }
  }, [status, activeNote]);

  async function undoAction() {
    if (!toast) return;
    const note = notes.find((item) => item.id === toast.noteId);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
    if (note) await handleAction(note, "restore");
    else {
      const response = await fetch("/api/notes/" + toast.noteId, { cache: "no-store" });
      if (response.ok) {
        const body = await response.json();
        await handleAction(body.note, "restore");
      }
    }
  }

  async function permanentlyDelete(note: Note) {
    if (!window.confirm("Eliminar esta nota permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      const response = await fetch("/api/notes/" + note.id + "?confirm=true", { method: "DELETE" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      setNotes((previous) => previous.filter((item) => item.id !== note.id));
      setTotal((value) => Math.max(0, value - 1));
    } catch {
      setError("No se pudo eliminar la nota permanentemente.");
    }
  }

  const onSaved = useCallback((saved: Note) => {
    setNotes((previous) => {
      const index = previous.findIndex((item) => item.id === saved.id);
      if (index < 0) return [saved, ...previous];
      return previous.map((item) => item.id === saved.id ? saved : item);
    });
    setTotal((value) => value + (notes.some((item) => item.id === saved.id) ? 0 : 1));
  }, [notes]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-32 pt-6 sm:px-6 lg:px-8" data-testid="notes-workspace">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-50">Captura personal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Notas rápidas</h1>
          <p className="mt-1 text-sm opacity-60">{total} {total === 1 ? "nota" : "notas"} · autoguardado activo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Configurar atajo global" onClick={() => setShortcutOpen((value) => !value)} aria-expanded={shortcutOpen} className="min-h-11 min-w-11 rounded-xl border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
            <Settings2 size={17} className="inline" /><span className="ml-2 hidden sm:inline">Atajo</span>
          </button>
          <div className="flex rounded-xl border p-1" style={{ borderColor: "var(--khora-border)" }}>
            <button type="button" aria-label="Vista de tarjetas" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className="min-h-11 min-w-11 rounded-lg" style={{ background: layout === "grid" ? "var(--khora-bg, rgba(127,127,127,.12))" : "transparent" }}><LayoutGrid className="mx-auto" size={17} /></button>
            <button type="button" aria-label="Vista de lista" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className="min-h-11 min-w-11 rounded-lg" style={{ background: layout === "list" ? "var(--khora-bg, rgba(127,127,127,.12))" : "transparent" }}><List className="mx-auto" size={17} /></button>
          </div>
          <button type="button" onClick={() => { setActiveNote(null); setEditorOpen(true); }} className="min-h-11 rounded-xl px-4 font-semibold" style={{ background: "var(--khora-accent)", color: "var(--khora-surface)" }}>
            <Plus className="mr-1 inline" size={18} />Nueva nota
          </button>
        </div>
      </header>

      {shortcutOpen && (
        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--khora-border)" }}>
          <label htmlFor="notes-shortcut" className="text-sm font-medium">Atajo global de captura</label>
          <select id="notes-shortcut" value={runtime.shortcut} onChange={(event) => runtime.setShortcut(event.target.value)} className="min-h-11 rounded-lg border bg-transparent px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
            <option>Ctrl+Alt+N</option><option>Alt+Shift+N</option>
          </select>
          <span className="text-xs opacity-60">Escape cierra el panel o el editor.</span>
        </section>
      )}

      {contextLabel && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--khora-bg, rgba(127,127,127,.12))" }}>Contexto activo: {contextLabel}</p>}

      <div className="flex flex-col gap-5 lg:flex-row">
        <NotesFilters
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={(next) => { setStatus(next); setSelectedTag(""); }}
          tags={tags}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
        />

        <section className="min-w-0 flex-1" aria-label="Lista de notas">
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/40 p-3 text-sm text-red-600">{error}</div>}
          {loading && notes.length === 0 ? (
            <div role="status" className="rounded-2xl border p-8 text-center text-sm opacity-60" style={{ borderColor: "var(--khora-border)" }}>Cargando notas…</div>
          ) : notes.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ borderColor: "var(--khora-border)" }}>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--khora-bg, rgba(127,127,127,.12))" }}><Plus size={24} /></div>
              <h2 className="font-semibold">{query || selectedTag ? "No hay coincidencias" : status === "active" ? "No hay notas todavía" : status === "archived" ? "No hay notas archivadas" : "La papelera está vacía"}</h2>
              <p className="mt-1 text-sm opacity-60">{status === "active" ? "Captura una idea sin título obligatorio y continúa después." : "Las notas que muevas aquí aparecerán en esta vista."}</p>
              {status === "active" && <button type="button" onClick={() => { setActiveNote(null); setEditorOpen(true); }} className="mt-4 min-h-11 rounded-xl px-4 font-semibold" style={{ background: "var(--khora-accent)", color: "var(--khora-surface)" }}>Crear primera nota</button>}
            </div>
          ) : (
            <>
              <div className={layout === "grid" ? "notes-masonry" : "space-y-3"}>
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} list={layout === "list"} onOpen={(note) => { setActiveNote(note); setEditorOpen(true); }} onAction={(item, action) => void handleAction(item, action)} onDelete={(item) => void permanentlyDelete(item)} />
                ))}
              </div>
              {hasMore && <div className="mt-5 text-center"><button type="button" disabled={loading} onClick={() => void loadNotes(page + 1, true)} className="min-h-11 rounded-xl border px-5 text-sm" style={{ borderColor: "var(--khora-border)" }}>{loading ? "Cargando…" : "Cargar más"}</button></div>}
            </>
          )}
        </section>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-4 rounded-xl px-4 py-3 shadow-xl" style={{ background: "var(--khora-ink)", color: "var(--khora-surface)" }}>
          <span className="text-sm">{toast.message}</span>
          <button type="button" onClick={() => void undoAction()} className="min-h-11 px-2 text-sm font-semibold underline">Deshacer</button>
        </div>
      )}

      {editorOpen && (
        <NotesEditor
          note={activeNote}
          onClose={() => { setEditorOpen(false); setActiveNote(null); }}
          onSaved={onSaved}
          onAction={async (note, action) => {
            const succeeded = await handleAction(note, action);
            if (succeeded) {
              setEditorOpen(false);
              setActiveNote(null);
            }
            return succeeded;
          }}
        />
      )}
    </main>
  );
}
