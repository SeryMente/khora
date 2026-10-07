// @l0 L0-002 · @req UI-REVIEW/PRERENDER-SCREEN · Prerender semántico por pantalla

import { notFound } from "next/navigation";
import { SCREENS, getAllScenariosForScreen } from "@/lib/ui-review/registry";
import type { ScreenId } from "@/lib/ui-review/types";
import {
  buildIngresoState,
  buildPipelineState,
  buildRegistroState,
  buildGrafoState,
  buildConsultaState,
  buildKpiState,
} from "@/lib/ui-review/states";
import { IngresoView } from "@/app/components/shared/IngresoView";
import { PipelineView } from "@/app/components/shared/PipelineView";
import { RegistroView } from "@/app/components/shared/RegistroView";
import { GrafoView } from "@/app/components/shared/GrafoView";
import { ConsultaView } from "@/app/components/shared/ConsultaView";
import { KpiPanelView } from "@/app/components/shared/KpiPanelView";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return SCREENS.map((screen) => ({ screen }));
}

function renderScenario(screen: ScreenId, scenario: string) {
  switch (screen) {
    case "ingreso":
      return <IngresoView isReviewMode state={buildIngresoState(scenario)} />;
    case "archivo":
    case "revision":
    case "aprobacion":
    case "ingesta":
      return <PipelineView isReviewMode state={buildPipelineState(scenario)} />;
    case "registro":
      return <RegistroView isReviewMode state={buildRegistroState(scenario)} />;
    case "grafo":
      return <GrafoView isReviewMode state={buildGrafoState(scenario)} />;
    case "consulta":
      return <ConsultaView isReviewMode state={buildConsultaState(scenario)} />;
    case "kpi":
      return <KpiPanelView state={buildKpiState(scenario)} />;
    default:
      return null;
  }
}

export default async function UiReviewStaticScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen: rawScreen } = await params;
  if (!SCREENS.includes(rawScreen as ScreenId)) notFound();

  const screen = rawScreen as ScreenId;
  const scenarios = getAllScenariosForScreen(screen);
  if (scenarios.length === 0) notFound();

  return (
    <main
      data-ui-review-static-screen={screen}
      style={{
        minHeight: "100vh",
        padding: "1.25rem",
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        fontFamily: "var(--font-geist-mono), monospace",
      }}
    >
      <header style={{ maxWidth: "90rem", margin: "0 auto 1rem" }}>
        <p style={{ fontSize: "0.6875rem", opacity: 0.55, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Khora · UI Review · prerender semántico
        </p>
        <h1 style={{ marginTop: "0.35rem", fontSize: "1.5rem", fontWeight: 700 }}>
          Pantalla: {screen}
        </h1>
        <p style={{ marginTop: "0.5rem", maxWidth: "60rem", fontSize: "0.8125rem", lineHeight: 1.6, opacity: 0.7 }}>
          Retrato estático de todos los escenarios registrados para esta pantalla.
          Comparte los mismos componentes presentacionales de producción y utiliza exclusivamente datos sintéticos.
        </p>
        <nav aria-label="Navegación UI Review" style={{ marginTop: "0.75rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem" }}>
          <a href="/ui-review/estatico" style={{ textDecoration: "underline" }}>Índice</a>
          <a href="/ui-review" style={{ textDecoration: "underline" }}>Harness interactivo</a>
          <a href="/ui-review/manifest.json" style={{ textDecoration: "underline" }}>Manifest</a>
        </nav>
      </header>

      <section aria-label={"Escenarios de " + screen} style={{ maxWidth: "90rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
        {scenarios.map((scenario) => (
          <article
            key={scenario.screen + ":" + scenario.scenario}
            data-ui-review-scenario={scenario.scenario}
            style={{ border: "1px solid var(--khora-border)", borderRadius: "0.9rem", overflow: "hidden", background: "var(--khora-surface)" }}
          >
            <header style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--khora-border)" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{scenario.title}</h2>
              <p style={{ marginTop: "0.3rem", fontSize: "0.75rem", lineHeight: 1.5, opacity: 0.7 }}>
                {scenario.description}
              </p>
              <p style={{ marginTop: "0.35rem", fontSize: "0.625rem", opacity: 0.5 }}>
                escenario: {scenario.scenario} · viewport recomendado: {scenario.recommended_viewport}
              </p>
            </header>
            <div style={{ minHeight: "20rem", background: "var(--khora-bg)" }}>
              {renderScenario(screen, scenario.scenario)}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
