"use client";

import { useEffect, useState } from "react";

const DURACION_MS = 1200;

export default function KhoraSplash() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(false), DURACION_MS);
        return () => clearTimeout(t);
    }, []);

    if (!visible) return null;

    return (
        <div
            data-testid="khora-splash"
            data-duracion-ms={DURACION_MS}
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--khora-absolute)",
                animation: "splash-animation " + DURACION_MS + "ms ease-in-out forwards",
            }}
        >
            <span
                style={{
                    color: "var(--khora-ink)",
                    fontFamily: "var(--font-sans), sans-serif",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "0.42em",
                    textTransform: "uppercase",
                    paddingLeft: "0.42em",
                }}
            >
                Khora
            </span>
        </div>
    );
}