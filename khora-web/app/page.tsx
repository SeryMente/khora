import AppIcon from "./components/os/AppIcon";

const SUPERFICIES = [
    { href: "/capturar", etiqueta: "Captura", icono: "Mic" },
    { href: "/sistema/dictado", etiqueta: "Dictado", icono: "Activity" },
    { href: "/sistema/volcados", etiqueta: "Archivo", icono: "Files" },
    { href: "/sistema/consulta", etiqueta: "Consulta", icono: "MessageSquareShare" },
    { href: "/grafo", etiqueta: "Nucleo", icono: "Network" },
    { href: "/sistema/boveda", etiqueta: "Boveda", icono: "LockKeyhole" },
];

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
                {SUPERFICIES.map((s) => (
                    <AppIcon key={s.href} href={s.href} etiqueta={s.etiqueta} icono={s.icono} />
                ))}
            </div>
        </div>
    );
}