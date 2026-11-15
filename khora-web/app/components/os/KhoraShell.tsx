"use client";

import type { ReactNode } from "react";
import type { NotesContextAdapter, QuickAction } from "@/lib/notes/types";
import SystemBar from "./SystemBar";
import NotesProvider from "../notas/NotesProvider";

const EMPTY_QUICK_ACTIONS: QuickAction[] = [];

export default function KhoraShell({
  children,
  contextAdapter = null,
  quickActions = EMPTY_QUICK_ACTIONS,
}: {
  children: ReactNode;
  contextAdapter?: NotesContextAdapter | null;
  quickActions?: QuickAction[];
}) {
  return (
    <NotesProvider contextAdapter={contextAdapter} quickActions={quickActions}>
      <div
        data-testid="khora-shell"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          color: "var(--khora-ink)",
        }}
      >
        <div style={{ flex: 1, width: "100%", paddingBottom: "6rem" }}>{children}</div>
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            minHeight: "6rem",
            zIndex: 40,
            backgroundColor: "var(--khora-surface)",
            borderTop: "1px solid var(--khora-border)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <SystemBar />
        </div>
      </div>
    </NotesProvider>
  );
}
