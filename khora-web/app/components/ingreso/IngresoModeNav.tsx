"use client";

import Link from "next/link";

export type IngresoWorkspaceMode = "nuevo" | "dictado" | "captura" | "archivo" | "revision" | "ingesta";

const MODES: Array<{ id: IngresoWorkspaceMode; label: string; query?: string }> = [
  { id: "nuevo", label: "Entrada" },
  { id: "dictado", label: "Dictado", query: "modo=dictado" },
  { id: "captura", label: "Captura", query: "modo=captura" },
  { id: "archivo", label: "Archivo", query: "modo=archivo" },
  { id: "revision", label: "Revisión", query: "modo=revision" },
  { id: "ingesta", label: "Ingesta", query: "modo=ingesta" },
];

export function IngresoModeNav({ activeMode }: { activeMode: IngresoWorkspaceMode }) {
  return (
    <nav aria-label="Modos de Ingreso" data-ui-id="ingreso.mode-nav" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--khora-border)", paddingBottom: 10 }}>
      {MODES.map((mode) => {
        const href = mode.query ? "/sistema/ingreso?" + mode.query : "/sistema/ingreso";
        const active = activeMode === mode.id;
        return (
          <Link
            key={mode.id}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "7px 11px",
              border: "1px solid var(--khora-border)",
              background: active ? "var(--khora-accent)" : "var(--khora-surface)",
              color: active ? "var(--khora-bg)" : "var(--khora-ink)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: active ? 700 : 500,
            }}
          >
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
