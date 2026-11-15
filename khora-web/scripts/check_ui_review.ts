// @l0 L0-002 · @req UI-REVIEW/CHECK · Guardia de integridad de escenarios, componentes y prerender

import { SCREENS, UI_REVIEW_SCENARIOS } from "../lib/ui-review/registry";
import { VIEWPORTS } from "../lib/ui-review/types";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔍 Verificando contrato UI Review completo...");

  let errors = 0;
  const fail = (message: string) => {
    console.error("❌ " + message);
    errors++;
  };

  if (!SCREENS.length) fail("SCREENS está vacío.");
  if (!Object.keys(UI_REVIEW_SCENARIOS).length) fail("No existen escenarios registrados.");

  const seenScenarioKeys = new Set<string>();
  for (const screen of SCREENS) {
    const scenarios = Object.values(UI_REVIEW_SCENARIOS).filter((scenario) => scenario.screen === screen);
    if (!scenarios.length) fail("La pantalla '" + screen + "' no tiene escenarios.");
  }

  for (const [key, scenario] of Object.entries(UI_REVIEW_SCENARIOS)) {
    if (seenScenarioKeys.has(key)) fail("Escenario duplicado: " + key);
    seenScenarioKeys.add(key);

    if (!scenario.screen || !SCREENS.includes(scenario.screen)) fail("Escenario con pantalla inválida: " + key);
    if (!scenario.scenario || !scenario.title || !scenario.description) fail("Escenario incompleto: " + key);
    if (!Array.isArray(scenario.ui_ids) || scenario.ui_ids.length === 0) fail("Escenario sin ui_ids: " + key);
    if (!VIEWPORTS[scenario.recommended_viewport]) fail("Viewport inválido en: " + key);
  }

  const sharedDir = path.join(process.cwd(), "app", "components", "shared");
  const requiredSharedComponents = [
    "IngresoView.tsx",
    "PipelineView.tsx",
    "RegistroView.tsx",
    "GrafoView.tsx",
    "ConsultaView.tsx",
    "KpiPanelView.tsx",
    "NotesReviewView.tsx",
  ];

  for (const component of requiredSharedComponents) {
    if (!fs.existsSync(path.join(sharedDir, component))) fail("Falta componente compartido: " + component);
  }

  const registeredUiIds = new Set<string>();
  for (const scenario of Object.values(UI_REVIEW_SCENARIOS)) {
    for (const id of scenario.ui_ids) registeredUiIds.add(id);
  }

  const uiIdPattern = /data-ui-id=["'`]([^"'`{}]+)["'`]/g;
  for (const fileName of requiredSharedComponents) {
    const content = fs.readFileSync(path.join(sharedDir, fileName), "utf8");
    let match: RegExpExecArray | null;
    while ((match = uiIdPattern.exec(content)) !== null) {
      if (!registeredUiIds.has(match[1])) fail("data-ui-id sin registro: " + match[1] + " en " + fileName);
    }

    if (/<(div|span)\b[^>]*\bonClick\s*=/.test(content)) {
      fail("Interacción onClick sobre elemento no semántico en " + fileName + "; use <button>, <a> o el control nativo apropiado.");
    }
  }

  const staticScreenPage = path.join(process.cwd(), "app", "ui-review", "[screen]", "estatico", "page.tsx");
  if (!fs.existsSync(staticScreenPage)) fail("Falta el prerender /ui-review/[screen]/estatico.");

  const manifestRoute = path.join(process.cwd(), "app", "ui-review", "manifest.json", "route.ts");
  if (!fs.existsSync(manifestRoute)) fail("Falta la ruta de manifest de UI Review.");

  if (errors > 0) {
    console.error("\n❌ UI Review rechazado: " + errors + " error(es).");
    process.exit(1);
  }

  console.log("\n✅ UI Review íntegro: escenarios, ui_ids, componentes compartidos y prerender presentes.");
}

main().catch((error) => {
  console.error("Fallo inesperado en UI Review:", error);
  process.exit(1);
});
