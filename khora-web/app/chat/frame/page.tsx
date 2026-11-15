export const dynamic = "force-dynamic";

export default function OpenWebUIFrameFallback() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "var(--khora-absolute)",
        color: "var(--khora-ink)",
        fontFamily: "inherit",
      }}
    >
      <section style={{ maxWidth: "28rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--khora-accent)" }}>
          Open WebUI
        </p>
        <h1 style={{ marginTop: "0.8rem", fontSize: "1.3rem", fontWeight: 500 }}>
          El chat no está habilitado
        </h1>
        <p style={{ marginTop: "0.7rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--khora-muted)" }}>
          La integración existente no está disponible en este entorno. Cora no ha iniciado una sesión externa.
        </p>
      </section>
    </main>
  );
}
