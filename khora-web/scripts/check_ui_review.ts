// @l0 L0-002 · @req UI-REVIEW/CHECK · Guardia de integridad de escenarios y componentes compartidos
import { SCREENS, UI_REVIEW_SCENARIOS } from "../lib/ui-review/registry";
import { ScreenId } from "../lib/ui-review/types";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔍 Verificando integridad del Harness UI Review...");

  let errors = 0;

  // 1. Verificación de pantallas
  if (!SCREENS || SCREENS.length === 0) {
    console.error("❌ Error: No se encontraron pantallas definidas en SCREENS.");
    errors++;
  } else {
    console.log(`✓ Registradas ${SCREENS.length} pantallas: ${SCREENS.join(", ")}`);
  }

  // 2. Cobertura de escenarios por pantalla
  for (const screen of SCREENS) {
    const scenariosForScreen = Object.values(UI_REVIEW_SCENARIOS).filter((s) => s.screen === screen);
    if (scenariosForScreen.length === 0) {
      console.error(`❌ Error: La pantalla '${screen}' no tiene escenarios registrados.`);
      errors++;
    } else {
      console.log(`  - Pantalla '${screen}': ${scenariosForScreen.length} escenarios.`);
    }
  }

  // 3. Verificación de ui_ids y metadatos en cada escenario
  for (const [key, sc] of Object.entries(UI_REVIEW_SCENARIOS)) {
    if (!sc.screen || !sc.scenario || !sc.title || !sc.description) {
      console.error(`❌ Error en escenario '${key}': Faltan campos obligatorios.`);
      errors++;
    }
    if (!Array.isArray(sc.ui_ids) || sc.ui_ids.length === 0) {
      console.error(`❌ Error en escenario '${key}': Lista 'ui_ids' vacía o inválida.`);
      errors++;
    }
  }

  // 4. Verificación de regla anti-duplicación (Componentes Compartidos)
  const sharedDir = path.join(process.cwd(), "app", "components", "shared");
  const expectedSharedComponents = [
    "IngresoView.tsx",
    "PipelineView.tsx",
    "RegistroView.tsx",
    "GrafoView.tsx",
  ];

  for (const comp of expectedSharedComponents) {
    const fullPath = path.join(sharedDir, comp);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Error Anti-Duplicación: Falta componente compartido obligatorio '${comp}' en app/components/shared.`);
      errors++;
    } else {
      console.log(`✓ Componente compartido verificado: ${comp}`);
    }
  }

  if (errors > 0) {
    console.error(`\n❌ Falló la verificación con ${errors} error(es).`);
    process.exit(1);
  }

  console.log("\n✅ UI Review integrity check exitoso: 0 errores.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fallo inesperado en check:", err);
  process.exit(1);
});
