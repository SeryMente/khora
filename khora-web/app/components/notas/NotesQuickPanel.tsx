"use client";

import { useEffect, useState } from "react";
import { X, Plus, Pin, StickyNote, ListChecks } from "lucide-react";
import { useNotesRuntime } from "./NotesProvider";
import type { Note } from "@/lib/notes/types";

export default function NotesQuickPanel() {
  const runtime = useNotesRuntime();
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"text" | "checklist">("text");
  const [pinned, setPinned] = useState<Note[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runtime.isQuickPanelOpen) return;
    let cancelled = false;
    void fetch("/api/notes?status=active&pageSize=100", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && data) setPinned((data.items as Note[]).filter((note) => note.is_pinned).slice(0, 6));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [runtime.isQuickPanelOpen]);

  useEffect(() => {
    if (!runtime.isQuickPanelOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const input = document.getElementById("notes-quick-capture");
    input?.focus();
    return () => previous?.focus?.();
  }, [runtime.isQuickPanelOpen]);

  async function capture() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const context = await runtime.contextAdapter?.getCurrentContext() ?? null;
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          content: mode === "text" ? content : "",
          checklist_items: mode === "checklist"
            ? content.split(/\r?\n/).filter((line) => line.trim()).map((text, position) => ({
                id: crypto.randomUUID(), text, is_completed: false, position,
              }))
            : [],
          color: "default",
          is_pinned: false,
          context_type: context?.type ?? null,
          context_id: context?.id ?? null,
          context_url: context?.url ?? null,
        }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la nota.");
      setContent("");
      window.dispatchEvent(new Event("khora:notes-changed"));
      runtime.closeQuickPanel();
    } catch {
      setError("No se pudo guardar. El contenido permanece en el editor para reintentar.");
    } finally {
      setSaving(false);
    }
  }

  if (!runtime.isQuickPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/35" onMouseDown={(event) => {
      if (event.target === event.currentTarget) runtime.closeQuickPanel();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-quick-title"
        className="absolute inset-0 flex flex-col border-l shadow-2xl sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[min(28rem,calc(100vw-2rem))] sm:rounded-2xl"
        style={{ background: "var(--khora-surface)", borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
      >
        <header className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--khora-border)" }}>
          <div>
            <h2 id="notes-quick-title" className="font-semibold">Notas rápidas</h2>
            <p className="text-xs opacity-60">Captura sin salir de la pantalla actual</p>
          </div>
          <button type="button" aria-label="Cerrar panel" onClick={runtime.closeQuickPanel} className="min-h-11 min-w-11 rounded-xl hover:bg-black/5">
            <X className="mx-auto" size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex gap-2">
            <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")} className="min-h-11 flex-1 rounded-xl border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
              <StickyNote className="mr-2 inline" size={16} />Texto
            </button>
            <button type="button" aria-pressed={mode === "checklist"} onClick={() => setMode("checklist")} className="min-h-11 flex-1 rounded-xl border px-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
              <ListChecks className="mr-2 inline" size={16} />Checklist
            </button>
          </div>
          <textarea
            id="notes-quick-capture"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void capture();
              }
            }}
            rows={6}
            placeholder={mode === "text" ? "Escribe una nota… usa #etiquetas" : "Un elemento por línea…"}
            className="w-full resize-y rounded-xl border p-3 text-base outline-none focus:ring-2"
            style={{ minHeight: "9rem", borderColor: "var(--khora-border)", background: "var(--khora-bg, transparent)", color: "var(--khora-ink)" }}
          />
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          <button type="button" onClick={() => void capture()} disabled={!content.trim() || saving} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-50" style={{ background: "var(--khora-accent)", color: "var(--khora-surface)" }}>
            <Plus size={18} />{saving ? "Guardando…" : "Guardar nota"}
          </button>

          <div className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Pin size={15} />Fijadas</h3>
            {pinned.length === 0 ? <p className="text-sm opacity-60">No hay notas fijadas.</p> : (
              <ul className="space-y-2">
                {pinned.map((note) => (
                  <li key={note.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>
                    <a href={"/notas?note=" + encodeURIComponent(note.id)} onClick={runtime.closeQuickPanel} className="font-medium hover:underline">
                      {(note.content.split(/\r?\n/).find((line) => line.trim()) || note.checklist_items.find((item) => item.text.trim())?.text || "Nota rápida").slice(0, 60)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <footer className="border-t p-3 text-center text-xs opacity-60" style={{ borderColor: "var(--khora-border)" }}>
          {runtime.shortcut} · Esc para cerrar
        </footer>
      </section>
    </div>
  );
}
