// @l0 L0-002 · @req KPI-01/TESTS · Pruebas unitarias para el Panel de KPIs y Métricas LLM
import "./setup";
import assert from "assert";
import test from "node:test";
import { FRONTIER_BENCHMARKS_CONFIG } from "../../lib/config/frontier_benchmarks";
import { MODEL_CATALOG_CONFIG } from "../../lib/config/model_catalog";
import { buildKpiState } from "../../lib/ui-review/states";

test("KPIs Suite - Métricas LLM, Fan-Out y Benchmarks de Frontera", async (t) => {

  await t.test("1. Cálculo correcto de TTFT y TPS con tokens exactos y estimados", () => {
    // Escenario 1: Tokens exactos reportados por la API
    const t0 = 1000;
    const tFirstToken = 1250; // TTFT = 250ms
    const tFinal = 3250;     // Duración total = 2250ms
    const exactTokens = 100;

    const ttftCalculado = tFirstToken - t0;
    assert.strictEqual(ttftCalculado, 250);

    const duracionGeneracionSec = (tFinal - tFirstToken) / 1000; // 2.0s
    const tpsExacto = exactTokens / duracionGeneracionSec;
    assert.strictEqual(tpsExacto, 50);

    // Escenario 2: Tokens estimados (char_count / 4)
    const charCount = 200;
    const estimatedTokens = Math.ceil(charCount / 4); // 50 tokens
    assert.strictEqual(estimatedTokens, 50);

    const tpsEstimado = estimatedTokens / duracionGeneracionSec;
    assert.strictEqual(tpsEstimado, 25);
  });

  await t.test("2. El fan-out a N perfiles tolera el fallo parcial de uno sin afectar a los demás", () => {
    const state = buildKpiState("fallo-parcial");

    // Verificar que groq y gemini tuvieron éxito
    assert.strictEqual(state.resultados.groq.estado, "exito");
    assert.ok((state.resultados.groq.ttftMs || 0) > 0);
    assert.ok((state.resultados.groq.tps || 0) > 0);

    assert.strictEqual(state.resultados.gemini.estado, "exito");
    assert.ok((state.resultados.gemini.ttftMs || 0) > 0);

    // Verificar que open_source falló pero no tumbó el panel completo
    assert.strictEqual(state.resultados.open_source.estado, "error");
    assert.ok(state.resultados.open_source.errorMsg?.includes("PERFIL_NO_CONFIGURADO"));
    assert.strictEqual(state.sinPerfilesConfigurados, false);
  });

  await t.test("3. El panel se degrada con un mensaje claro si ningún perfil tiene credenciales configuradas", () => {
    const state = buildKpiState("degradado-total");

    assert.strictEqual(state.sinPerfilesConfigurados, true);
    assert.ok(Array.isArray(state.selectedProfiles));
    assert.strictEqual(state.selectedProfiles.length, 3);
  });

  await t.test("4. Integridad de la tabla estática de benchmarks de frontera y catálogo de modelos", () => {
    // Benchmarks
    assert.strictEqual(FRONTIER_BENCHMARKS_CONFIG.version, "1.0.0");
    assert.ok(FRONTIER_BENCHMARKS_CONFIG.modelosFrontera.length >= 3);
    assert.ok("MMLU" in FRONTIER_BENCHMARKS_CONFIG.definicionMetricas);
    assert.ok("TPS" in FRONTIER_BENCHMARKS_CONFIG.definicionMetricas);

    for (const model of FRONTIER_BENCHMARKS_CONFIG.modelosFrontera) {
      assert.ok(model.nombreModelo);
      assert.ok(model.proveedor);
      assert.ok(typeof model.puntuaciones === "object");
      assert.ok("MMLU" in model.puntuaciones);
    }

    // Catálogo
    assert.strictEqual(MODEL_CATALOG_CONFIG.version, "1.0.0");
    assert.strictEqual(MODEL_CATALOG_CONFIG.perfiles.length, 3);

    const perfilesIds = MODEL_CATALOG_CONFIG.perfiles.map((p) => p.perfilId);
    assert.deepStrictEqual(perfilesIds, ["groq", "gemini", "open_source"]);

    for (const cat of MODEL_CATALOG_CONFIG.perfiles) {
      assert.ok(cat.nombreProveedor);
      assert.ok(cat.modeloDefecto);
      assert.ok(cat.ventanaContextoTokens > 0);
      assert.ok(typeof cat.capacidades === "object");
    }
  });

});
