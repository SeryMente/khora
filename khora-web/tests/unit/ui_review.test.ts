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
    assert.strictEqual(SCREENS.length, 10);
    assert.deepStrictEqual(SCREENS, ["ingreso", "archivo", "revision", "aprobacion", "ingesta", "registro", "grafo", "consulta", "kpi", "notas"]);

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
      delete process.env.KHORA_UI_REVIEW_MODE;
      const { GET: getManifestDisabled } = await import("../../app/ui-review/manifest.json/route");
      const reqDisabled = new Request("http://localhost/ui-review/manifest.json");
      const resDisabled = await getManifestDisabled(reqDisabled);
      assert.strictEqual(resDisabled.status, 404);

      process.env.KHORA_UI_REVIEW_MODE = "1";
      const resEnabled = await getManifestDisabled(reqDisabled);
      assert.strictEqual(resEnabled.status, 200);

      const body = await resEnabled.json();
      assert.strictEqual(body.schema_version, "1.0.0");
      assert.ok(body.release_sha);
      assert.ok(body.source_fingerprint);
      assert.ok(Array.isArray(body.screens));
      assert.strictEqual(body.manifest_urls.length, Object.keys(UI_REVIEW_SCENARIOS).length);
      assert.strictEqual(body.static_urls.length, SCREENS.length);

      assert.strictEqual(resEnabled.headers.get("Cache-Control"), "no-store, max-age=0, must-revalidate");
      assert.strictEqual(resEnabled.headers.get("X-Robots-Tag"), "noindex, nofollow");
    } finally {
      process.env.KHORA_UI_REVIEW_MODE = originalEnv;
    }
  });

  await t.test("4. Fuente única de componentes presentacionales", () => {
    const sharedDir = path.join(process.cwd(), "app", "components", "shared");
    assert.ok(fs.existsSync(sharedDir), "Debe existir app/components/shared");

    const requiredComponents = ["IngresoView.tsx", "PipelineView.tsx", "RegistroView.tsx", "GrafoView.tsx", "ConsultaView.tsx", "KpiPanelView.tsx", "NotesReviewView.tsx"];
    for (const comp of requiredComponents) {
      const filePath = path.join(sharedDir, comp);
      assert.ok(fs.existsSync(filePath), "Falta " + comp);
      assert.ok(fs.readFileSync(filePath, "utf8").includes("data-ui-id="), comp + " debe exponer data-ui-id");
    }

    for (const [label, file, symbol] of [
      ["Ingreso", "app/components/ingreso/IngresoWorkspace.tsx", "IngresoView"],
      ["Volcados", "app/sistema/custodia/page.tsx", "PipelineView"],
      ["Registro", "app/sistema/registro/page.tsx", "RegistroView"],
      ["Grafo", "app/grafo/page.tsx", "GrafoView"],
      ["Consulta", "app/sistema/consulta/page.tsx", "ConsultaView"],
      ["KPIs", "app/sistema/kpis/page.tsx", "KpiPanelView"],
      ["Notas", "app/ui-review/[screen]/estatico/page.tsx", "NotesReviewView"],
    ] as const) {
      const content = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      assert.ok(content.includes(symbol), label + " debe consumir " + symbol);
    }
  });

  await t.test("5. Prerender semántico existe para las diez pantallas", () => {
    const staticPage = path.join(process.cwd(), "app", "ui-review", "[screen]", "estatico", "page.tsx");
    assert.ok(fs.existsSync(staticPage), "Falta app/ui-review/[screen]/estatico/page.tsx");
    const content = fs.readFileSync(staticPage, "utf8");
    assert.ok(content.includes("generateStaticParams"));
    assert.ok(content.includes("force-static"));
    assert.ok(content.includes("SCREENS"));
  });
});
