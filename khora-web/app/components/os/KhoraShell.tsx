"use client";

import type { ReactNode } from "react";
import SystemBar from "./SystemBar";

export default function KhoraShell({ children }: { children: ReactNode }) {
    return (
        <div
            data-testid="khora-shell"
            style={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                color: "var(--khora-ink)",
            }}
        >
            <main style={{ flex: 1, width: "100%", paddingBottom: "6rem" }}>{children}</main>
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 40,
                    backgroundColor: "var(--khora-surface)",
                    borderTop: "1px solid var(--khora-border)",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}
            >
                <SystemBar />
            </div>
        </div>
    );
}