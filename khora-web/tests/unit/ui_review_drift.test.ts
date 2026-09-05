// @l0 L0-002 · @req UI-REVIEW/ANTIDERIVA
//
// GUARDIAN DE CERO DERIVA entre la UI de produccion y UI Review.
//
// Los componentes de app/components/shared son la unica fuente de interfaz:
// los renderizan tanto las rutas de produccion como UI Review. Estas pruebas
// impiden que el registro de escenarios se desincronice de ellos.
//
// Si alguien anade, renombra o elimina un data-ui-id sin actualizar
// lib/ui-review/registry.ts, estas pruebas fallan, el gate de CI bloquea la
// fusion y la deriva no llega a main.

import assert from "assert";
import test from "node:test";
import fs from "fs";
import path from "path";
import {
  UI_REVIEW_SCENARIOS,
  SCREENS,
  getAllScenariosForScreen,
} from "../../lib/ui-review/registry";
import {
  buildIngresoState,
  buildPipelineState,
  buildRegistroState,
  buildGrafoState,
  PANTALLAS_PIPELINE,
} from "../../lib/ui-review/states";

const SHARED_DIR = path.join(process.cwd(), "app", "components", "shared");

const COMPONENTES_OBLIGATORIOS = [
  "IngresoView.tsx",
  "PipelineView.tsx",
  "RegistroView.tsx",
  "GrafoView.tsx",
];

function uiIdsDeComponentes(): Set<string> {
  const encontrados = new Set<string>();
  for (const archivo of COMPONENTES_OBLIGATORIOS) {
    const contenido = fs.readFileSync(path.join(SHARED_DIR, archivo), "utf8");
    const patron = /data-ui-id=["'`]([^"'`{}]+)["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(contenido)) !== null) {
      encontrados.add(m[1]);
    }
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

test("existen los cuatro componentes compartidos obligatorios", () => {
  for (const archivo of COMPONENTES_OBLIGATORIOS) {
    assert.ok(
      fs.existsSync(path.join(SHARED_DIR, archivo)),
      `Falta el componente compartido obligatorio ${archivo}`
    );
  }
});

test("ningun data-ui-id de produccion queda sin registrar en UI Review", () => {
  const enComponentes = uiIdsDeComponentes();
  const registrados = uiIdsDelRegistro();
  const sinRegistrar = [...enComponentes].filter((id) => !registrados.has(id)).sort();

  assert.deepStrictEqual(
    sinRegistrar,
    [],
    "DERIVA: hay data-ui-id en app/components/shared que no aparecen en ningun escenario de lib/ui-review/registry.ts:\n  " +
      sinRegistrar.join("\n  ")
  );
});

test("el registro no declara ui_ids inexistentes", () => {
  const enComponentes = uiIdsDeComponentes();
  const registrados = uiIdsDelRegistro();
  const fantasmas = [...registrados].filter((id) => !enComponentes.has(id)).sort();

  assert.deepStrictEqual(
    fantasmas,
    [],
    "DERIVA: lib/ui-review/registry.ts declara ui_ids que ya no existen en los componentes compartidos:\n  " +
      fantasmas.join("\n  ")
  );
});

test("cada pantalla declarada tiene al menos un escenario y ui_ids", () => {
  for (const screen of SCREENS) {
    const escenarios = getAllScenariosForScreen(screen);
    assert.ok(
      escenarios.length > 0,
      `La pantalla '${screen}' no tiene escenarios registrados`
    );
    for (const def of escenarios) {
      assert.ok(
        Array.isArray(def.ui_ids) && def.ui_ids.length > 0,
        `El escenario ${def.screen}:${def.scenario} no declara ui_ids`
      );
      assert.ok(
        def.title.length > 0 && def.description.length > 0,
        `El escenario ${def.screen}:${def.scenario} no esta descrito`
      );
    }
  }
});

test("todo escenario registrado produce un estado tipado valido", () => {
  for (const def of Object.values(UI_REVIEW_SCENARIOS)) {
    if (def.screen === "ingreso") {
      const s = buildIngresoState(def.scenario);
      assert.ok(
        s.estado === "inactivo" || s.estado === "dictando",
        `Estado invalido en ingreso:${def.scenario}`
      );
    } else if (PANTALLAS_PIPELINE.includes(def.screen)) {
      const s = buildPipelineState(def.scenario);
      assert.ok(Array.isArray(s.pipelineItems));
      assert.ok(
        s.viewMode === "lectura" || s.viewMode === "edicion",
        `viewMode invalido en ${def.screen}:${def.scenario}`
      );
    } else if (def.screen === "registro") {
      const s = buildRegistroState(def.scenario);
      assert.ok(Array.isArray(s.eventos));
    } else if (def.screen === "grafo") {
      const s = buildGrafoState(def.scenario);
      assert.ok(Array.isArray(s.nodes));
      assert.ok(Array.isArray(s.edges));
    }
  }
});

test("los escenarios vacios y de error son deterministas", () => {
  assert.deepStrictEqual(buildPipelineState("empty").pipelineItems, []);
  assert.strictEqual(buildPipelineState("empty").selectedId, null);
  assert.deepStrictEqual(buildRegistroState("empty").eventos, []);
  assert.deepStrictEqual(buildGrafoState("empty").nodes, []);
  assert.ok(buildIngresoState("error").error.length > 0);
  assert.ok((buildRegistroState("error").error || "").length > 0);
});

test("los fixtures no contienen datos que aparenten ser reales", () => {
  const fixtures = fs.readFileSync(
    path.join(process.cwd(), "lib", "ui-review", "fixtures.ts"),
    "utf8"
  );
  for (const prohibido of ["postgres://", "neo4j://", "sk-", "Bearer ", "@vercel-storage"]) {
    assert.ok(
      !fixtures.includes(prohibido),
      `Los fixtures sinteticos no deben contener '${prohibido}'`
    );
  }
});
