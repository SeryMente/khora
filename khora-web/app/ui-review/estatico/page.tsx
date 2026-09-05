// @l0 L0-002 · @req UI-REVIEW/PRERENDER-INDEX · Índice legible sin JavaScript

import { SCREENS, getAllScenariosForScreen } from "@/lib/ui-review/registry";

export const dynamic = "force-static";
export const revalidate = false;

export default function UiReviewEstaticoIndexPage() {
  const total = SCREENS.reduce(
    (acc, s) => acc + getAllScenariosForScreen(s).length,
    0
  );

  return (
    <main
      style={{
        padding: "1.5rem",
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
        Khora · UI Review · Prerender semántico
      </h1>
      <p style={{ fontSize: "0.875rem", maxWidth: "48rem" }}>
        Estas páginas renderizan en el servidor los mismos componentes
        compartidos que usa la interfaz de producción, alimentados con datos
        sintéticos. No requieren JavaScript, no acceden a datos reales y no
        producen efectos externos. {SCREENS.length} pantallas, {total}{" "}
        escenarios.
      </p>

      <ul style={{ fontSize: "0.875rem", lineHeight: 2 }}>
        {SCREENS.map((s) => {
          const escenarios = getAllScenariosForScreen(s);
          return (
            <li key={s}>
              <a
                href={`/ui-review/${s}/estatico`}
                style={{ textDecoration: "underline", fontWeight: 600 }}
              >
                {s}
              </a>
              <span style={{ opacity: 0.75 }}>
                {" "}
                — {escenarios.length} escenarios:{" "}
                {escenarios.map((e) => e.scenario).join(", ")}
              </span>
            </li>
          );
        })}
      </ul>

      <p style={{ fontSize: "0.8125rem" }}>
        <a href="/ui-review/manifest.json" style={{ textDecoration: "underline" }}>
          manifest.json
        </a>{" "}
        · <a href="/ui-review" style={{ textDecoration: "underline" }}>
          harness interactivo (requiere JavaScript)
        </a>
      </p>
    </main>
  );
}
