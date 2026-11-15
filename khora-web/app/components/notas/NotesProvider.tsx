"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { NotesContextAdapter, QuickAction } from "@/lib/notes/types";
import NotesQuickPanel from "./NotesQuickPanel";

type NotesRuntime = {
  isQuickPanelOpen: boolean;
  openQuickPanel: () => void;
  closeQuickPanel: () => void;
  shortcut: string;
  setShortcut: (value: string) => void;
  contextAdapter: NotesContextAdapter | null;
  quickActions: QuickAction[];
};

const NotesRuntimeContext = createContext<NotesRuntime | null>(null);
const DEFAULT_SHORTCUT = "Alt+Shift+N";
const SHORTCUT_OPTIONS = new Set(["Ctrl+Alt+N", "Alt+Shift+N"]);

function matchesShortcut(event: KeyboardEvent, shortcut: string) {
  const parts = shortcut.split("+");
  const key = parts.at(-1)?.toLowerCase();
  return event.key.toLowerCase() === key &&
    event.ctrlKey === parts.includes("Ctrl") &&
    event.altKey === parts.includes("Alt") &&
    event.shiftKey === parts.includes("Shift");
}

export function useNotesRuntime() {
  const value = useContext(NotesRuntimeContext);
  if (!value) throw new Error("useNotesRuntime debe usarse dentro de NotesProvider.");
  return value;
}

export default function NotesProvider({
  children,
  contextAdapter = null,
  quickActions = [],
}: {
  children: ReactNode;
  contextAdapter?: NotesContextAdapter | null;
  quickActions?: QuickAction[];
}) {
  const [isQuickPanelOpen, setQuickPanelOpen] = useState(false);
  const [shortcut, setShortcutState] = useState(DEFAULT_SHORTCUT);

  useEffect(() => {
    const stored = localStorage.getItem("khora-notes-shortcut");
    if (stored && SHORTCUT_OPTIONS.has(stored)) setShortcutState(stored);
  }, []);

  const openQuickPanel = useCallback(() => setQuickPanelOpen(true), []);
  const closeQuickPanel = useCallback(() => setQuickPanelOpen(false), []);
  const setShortcut = useCallback((value: string) => {
    if (!SHORTCUT_OPTIONS.has(value)) return;
    setShortcutState(value);
    localStorage.setItem("khora-notes-shortcut", value);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        setQuickPanelOpen(true);
        return;
      }
      if (event.key === "Escape") setQuickPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  const value = useMemo<NotesRuntime>(() => ({
    isQuickPanelOpen, openQuickPanel, closeQuickPanel, shortcut, setShortcut,
    contextAdapter, quickActions,
  }), [isQuickPanelOpen, openQuickPanel, closeQuickPanel, shortcut, setShortcut, contextAdapter, quickActions]);

  return (
    <NotesRuntimeContext.Provider value={value}>
      {children}
      <NotesQuickPanel />
    </NotesRuntimeContext.Provider>
  );
}
