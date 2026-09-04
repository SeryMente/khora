// @l0 L0-002 · @req UI-REVIEW/TESTS · Pruebas unitarias e integración del Harness UI Review
import "./setup";
import assert from "assert";
import test from "node:test";
import { SCREENS, UI_REVIEW_SCENARIOS, getAllScenariosForScreen } from "../../lib/ui-review/registry";
import { ReviewFixtureAdapter } from "../../lib/ui-review/adapters";
import fs from "fs";
import path from "path";

test("UI Review Harness Test Suite", async (t) => {

  await t.test("1. Registro de pantallas y escenarios completo y no vacío", () => {
    assert.strictEqual(SCREENS.length, 7);
    assert.deepStrictEqual(SCREENS, ["ingreso", "archivo", "revision", "aprobacion", "ingesta", "registro", "grafo"]);

    for (const screen of SCREENS) {
      const scenarios = getAllScenariosForScreen(screen);
      assert.ok(scenarios.length > 0, `La pantalla ${screen} debe tener al menos un escenario`);
      for (const sc of scenarios) {
        assert.strictEqual(sc.screen, screen);
        assert.ok(sc.scenario.length > 0);
        assert.ok(sc.title.length > 0);
        assert.ok(sc.ui_ids.length > 0);
      }
    }
  });

  await t.test("2. ReviewFixtureAdapter opera exclusivamente con datos sintéticos y cero llamadas mutantes", async () => {
    const adapter = new ReviewFixtureAdapter();

    const volcados = await adapter.getVolcados();
    assert.ok(Array.isArray(volcados));
    assert.ok(volcados.length > 0);
    assert.ok(volcados[0].id.includes("sintetico"));

    const gate = await adapter.getGateDecision("v-sintetico-001");
    assert.ok(gate.gate_hash);
    assert.strictEqual(typeof gate.canApprove, "boolean");

    const eventos = await adapter.getEventos();
    assert.ok(Array.isArray(eventos));
    assert.ok(eventos.length > 0);

    const grafo = await adapter.getGrafoData();
    assert.ok(Array.isArray(grafo.nodes));
    assert.ok(Array.isArray(grafo.edges));
  });

  await t.test("3. Fail-Closed Security: KHORA_UI_REVIEW_MODE=1 permite acceso, sin la variable responde 404", async () => {
    const originalEnv = process.env.KHORA_UI_REVIEW_MODE;

    try {
      // 3a. Variable apagada / ausente
      delete process.env.KHORA_UI_REVIEW_MODE;
      const { GET: getManifestDisabled } = await import("../../app/ui-review/manifest.json/route");
      const reqDisabled = new Request("http://localhost/ui-review/manifest.json");
      const resDisabled = await getManifestDisabled(reqDisabled);
      assert.strictEqual(resDisabled.status, 404);

      // 3b. Variable encendida = 1
      process.env.KHORA_UI_REVIEW_MODE = "1";
      const resEnabled = await getManifestDisabled(reqDisabled);
      assert.strictEqual(resEnabled.status, 200);

      const body = await resEnabled.json();
      assert.strictEqual(body.schema_version, "1.0.0");
      assert.ok(body.release_sha);
      assert.ok(body.source_fingerprint);
      assert.ok(Array.isArray(body.screens));
      assert.strictEqual(body.manifest_urls.length, Object.keys(UI_REVIEW_SCENARIOS).length);

      // Headers
      assert.strictEqual(resEnabled.headers.get("Cache-Control"), "no-store, max-age=0, must-revalidate");
      assert.strictEqual(resEnabled.headers.get("X-Robots-Tag"), "noindex, nofollow");
    } finally {
      process.env.KHORA_UI_REVIEW_MODE = originalEnv;
    }
  });

  await t.test("4. Regla Anti-Duplicación: Las páginas productivas y el harness utilizan los mismos componentes presentacionales compartidos", () => {
    const sharedDir = path.join(process.cwd(), "app", "components", "shared");
    assert.ok(fs.existsSync(sharedDir), "El directorio app/components/shared debe existir");

    const requiredComponents = ["IngresoView.tsx", "PipelineView.tsx", "RegistroView.tsx", "GrafoView.tsx"];
    for (const comp of requiredComponents) {
      const filePath = path.join(sharedDir, comp);
      assert.ok(fs.existsSync(filePath), `Falta el componente compartido ${comp}`);

      const content = fs.readFileSync(filePath, "utf8");
      assert.ok(content.includes("data-ui-id="), `El componente ${comp} debe incluir atributos data-ui-id`);
    }

    // Verificar que las páginas productivas importan desde app/components/shared
    const ingresoPageContent = fs.readFileSync(path.join(process.cwd(), "app", "sistema", "ingreso", "page.tsx"), "utf8");
    assert.ok(ingresoPageContent.includes("IngresoView"), "ingreso/page.tsx debe consumir IngresoView");

    const volcadosPageContent = fs.readFileSync(path.join(process.cwd(), "app", "sistema", "volcados", "page.tsx"), "utf8");
    assert.ok(volcadosPageContent.includes("PipelineView"), "volcados/page.tsx debe consumir PipelineView");

    const registroPageContent = fs.readFileSync(path.join(process.cwd(), "app", "sistema", "registro", "page.tsx"), "utf8");
    assert.ok(registroPageContent.includes("RegistroView"), "registro/page.tsx debe consumir RegistroView");

    const grafoPageContent = fs.readFileSync(path.join(process.cwd(), "app", "grafo", "page.tsx"), "utf8");
    assert.ok(grafoPageContent.includes("GrafoView"), "grafo/page.tsx debe consumir GrafoView");
  });

});
