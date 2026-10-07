// @l0 L0-002 · @req UI-REVIEW/ANTIDERIVA · Guardian de cero deriva entre producción y revisión

import assert from "assert";
import test from "node:test";
import fs from "fs";
import path from "path";
import { UI_REVIEW_SCENARIOS, SCREENS, getAllScenariosForScreen } from "../../lib/ui-review/registry";
import { buildIngresoState, buildPipelineState, buildRegistroState, buildGrafoState, buildConsultaState, buildKpiState, PANTALLAS_PIPELINE } from "../../lib/ui-review/states";

const SHARED_DIR = path.join(process.cwd(), "app", "components", "shared");
const COMPONENTES_OBLIGATORIOS = [
  "IngresoView.tsx",
  "PipelineView.tsx",
  "RegistroView.tsx",
  "GrafoView.tsx",
  "ConsultaView.tsx",
  "KpiPanelView.tsx",
];

function uiIdsDeComponentes(): Set<string> {
  const encontrados = new Set<string>();
  for (const archivo of COMPONENTES_OBLIGATORIOS) {
    const contenido = fs.readFileSync(path.join(SHARED_DIR, archivo), "utf8");
    const patron = /data-ui-id=["'`]([^"'`{}]+)["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(contenido)) !== null) encontrados.add(m[1]);
  }
  return encontrados;
}

function uiIdsDelRegistro(): Set<string> {
  const registrados = new Set<string>();
  for (const def of Object.values(UI_REVIEW_SCENARIOS)) {
    for (const id of def.ui_ids) registrados.add(id);
  }
  return registrados;
}

test("existen todos los componentes compartidos obligatorios", () => {
  for (const archivo of COMPONENTES_OBLIGATORIOS) assert.ok(fs.existsSync(path.join(SHARED_DIR, archivo)), "Falta " + archivo);
});

test("ningun data-ui-id de produccion queda sin registrar", () => {
  const enComponentes = uiIdsDeComponentes();
  const registrados = uiIdsDelRegistro();
  const sinRegistrar = [...enComponentes].filter((id) => !registrados.has(id)).sort();
  assert.deepStrictEqual(sinRegistrar, [], "DERIVA: ui_ids sin escenario:\n  " + sinRegistrar.join("\n  "));
});

test("el registro no declara ui_ids fantasmas", () => {
  const enComponentes = uiIdsDeComponentes();
  const registrados = uiIdsDelRegistro();
  const fantasmas = [...registrados].filter((id) => !enComponentes.has(id)).sort();
  assert.deepStrictEqual(fantasmas, [], "DERIVA: ui_ids inexistentes:\n  " + fantasmas.join("\n  "));
});

test("cada pantalla declarada tiene escenarios y estados tipados", () => {
  for (const screen of SCREENS) {
    const escenarios = getAllScenariosForScreen(screen);
    assert.ok(escenarios.length > 0, "Sin escenarios: " + screen);
    for (const def of escenarios) {
      assert.ok(def.ui_ids.length > 0, "Sin ui_ids: " + def.screen + ":" + def.scenario);
      if (def.screen === "ingreso") {
        const state = buildIngresoState(def.scenario);
        assert.ok(state.estado === "inactivo" || state.estado === "dictando");
      } else if (PANTALLAS_PIPELINE.includes(def.screen)) {
        const state = buildPipelineState(def.scenario);
        assert.ok(Array.isArray(state.pipelineItems));
      } else if (def.screen === "registro") {
        assert.ok(Array.isArray(buildRegistroState(def.scenario).eventos));
      } else if (def.screen === "grafo") {
        assert.ok(Array.isArray(buildGrafoState(def.scenario).nodes));
      } else if (def.screen === "consulta") {
        assert.ok(Array.isArray(buildConsultaState(def.scenario).mensajes));
      } else if (def.screen === "kpi") {
        assert.ok(Array.isArray(buildKpiState(def.scenario).selectedProfiles));
      }
    }
  }
});

test("los escenarios de error y vacío son deterministas", () => {
  assert.deepStrictEqual(buildPipelineState("empty").pipelineItems, []);
  assert.deepStrictEqual(buildRegistroState("empty").eventos, []);
  assert.deepStrictEqual(buildGrafoState("empty").nodes, []);
  assert.deepStrictEqual(buildConsultaState("empty").mensajes, []);
  assert.ok(buildIngresoState("error").error.length > 0);
  assert.ok((buildRegistroState("error").error || "").length > 0);
});

test("los fixtures no contienen credenciales ni endpoints reales", () => {
  const fixtures = fs.readFileSync(path.join(process.cwd(), "lib", "ui-review", "fixtures.ts"), "utf8");
  for (const prohibited of ["postgres://", "neo4j://", "sk-", "Bearer ", "@vercel-storage"]) {
    assert.ok(!fixtures.includes(prohibited), "Fixture contiene marcador prohibido: " + prohibited);
  }
});
