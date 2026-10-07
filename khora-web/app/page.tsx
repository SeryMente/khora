// @l0 L0-002-R · @req UI-01/REQ-1
import AppIcon from "./components/os/AppIcon";
import { NAVIGATION_REGISTRY } from "./navigation/registry";

export default function Home() {
    return (
        <div
            data-testid="khora-desktop"
            style={{
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem 1.5rem",
            }}
        >
            <header style={{ marginBottom: "3rem", textAlign: "center" }}>
                <h1
                    style={{
                        fontSize: "1.75rem",
                        fontWeight: 600,
                        letterSpacing: "0.42em",
                        textTransform: "uppercase",
                        paddingLeft: "0.42em",
                        color: "var(--khora-ink)",
                    }}
                >
                    Khora
                </h1>
                <p
                    style={{
                        marginTop: "0.75rem",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.6875rem",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: "var(--khora-accent)",
                    }}
                >
                    Memoria continua
                </p>
            </header>

            <div
                data-testid="desktop-axis"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "1.5rem",
                    width: "100%",
                    maxWidth: "24rem",
                }}
            >
                {NAVIGATION_REGISTRY.map((entry) => (
                    <AppIcon
                        key={entry.id}
                        href={entry.href}
                        etiqueta={entry.label}
                        icono={entry.icon}
                    />
                ))}
            </div>
        </div>
    );
}
