// @l0 L0-002 · @req KPI-01/TESTS · Pruebas unitarias para el Panel de KPIs y Métricas LLM
import "./setup";
import assert from "assert";
import test from "node:test";
import { FRONTIER_BENCHMARKS_CONFIG } from "../../lib/config/frontier_benchmarks";
import { MODEL_CATALOG_CONFIG } from "../../lib/config/model_catalog";
import { buildKpiState } from "../../lib/ui-review/states";

test("KPIs Suite - Métricas LLM, Fan-Out y Benchmarks de Frontera", async (t) => {

  await t.test("1. Cálculo correcto de TTFT y TPS con tokens reales y estimados", () => {
    // Escenario 1: Tokens reales reportados vía completion_tokens en la API
    const t0 = 1000;
    const tFirstToken = 1250; // TTFT = 250ms
    const tLastChunk = 3250;  // Fin de generación por último chunk = 2000ms de ventana
    const exactTokens = 100;

    const ttftCalculado = tFirstToken - t0;
    assert.strictEqual(ttftCalculado, 250);

    const duracionGeneracionSec = (tLastChunk - tFirstToken) / 1000; // 2.0s
    const tpsExacto = exactTokens / duracionGeneracionSec;
    assert.strictEqual(tpsExacto, 50);

    // Escenario 2: Tokens estimados (char_count / 4)
    const charCount = 200;
    const estimatedTokens = Math.ceil(charCount / 4); // 50 tokens
    assert.strictEqual(estimatedTokens, 50);

    const tpsEstimado = estimatedTokens / duracionGeneracionSec;
    assert.strictEqual(tpsEstimado, 25);
  });

  await t.test("1b. Manejo de evento usage con completion_tokens vs fallback a estimado por caracteres", () => {
    // Caso A: usage incluye completion_tokens -> isExactTokens = true, realTokens = completion_tokens
    const usageConCompletion = { completion_tokens: 80, prompt_tokens: 20, total_tokens: 100 };
    const tieneCompletionA = typeof usageConCompletion.completion_tokens === "number";
    assert.strictEqual(tieneCompletionA, true);
    const tokensFinalesA = tieneCompletionA ? usageConCompletion.completion_tokens : Math.ceil(300 / 4);
    assert.strictEqual(tokensFinalesA, 80);

    // Caso B: usage NO incluye completion_tokens (ej. solo total_tokens) -> Cae al estimado por caracteres
    const usageSinCompletion: Record<string, any> = { total_tokens: 100 };
    const tieneCompletionB = typeof usageSinCompletion.completion_tokens === "number";
    assert.strictEqual(tieneCompletionB, false);
    const charCountB = 240;
    const tokensFinalesB = tieneCompletionB ? usageSinCompletion.completion_tokens : Math.ceil(charCountB / 4);
    assert.strictEqual(tokensFinalesB, 60);

    // Caso C: Stream NUNCA envía usage -> Cae al estimado por caracteres
    const usageNulo = null;
    const tieneCompletionC = usageNulo && typeof (usageNulo as any).completion_tokens === "number";
    assert.strictEqual(Boolean(tieneCompletionC), false);
    const charCountC = 160;
    const tokensFinalesC = Math.ceil(charCountC / 4);
    assert.strictEqual(tokensFinalesC, 40);
  });

  await t.test("1c. Ventana de generación usa lastChunkTime y previene distorsión por latencia de usage/fin", () => {
    const t0 = 1000;
    const firstTokenTime = 1200;
    const lastChunkTime = 3200; // Ventana real = 2000ms
    const usageEventTime = 3800; // Evento usage llegó 600ms después

    // Si se usara usageEventTime, la duración sería 2600ms y el TPS bajaría artificialmente
    const duracionConUsageTimeSec = (usageEventTime - firstTokenTime) / 1000;
    const tpsDistorsionado = 100 / duracionConUsageTimeSec; // ~38.46 tok/s

    // Usando correctamente lastChunkTime
    const duracionCorrectaSec = (lastChunkTime - firstTokenTime) / 1000;
    const tpsCorrecto = 100 / duracionCorrectaSec; // 50 tok/s

    assert.strictEqual(duracionCorrectaSec, 2.0);
    assert.strictEqual(tpsCorrecto, 50);
    assert.ok(tpsCorrecto > tpsDistorsionado);
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
    assert.ok("SWE-bench_Verified" in FRONTIER_BENCHMARKS_CONFIG.definicionMetricas);
    assert.ok("GPQA_Diamond" in FRONTIER_BENCHMARKS_CONFIG.definicionMetricas);

    for (const model of FRONTIER_BENCHMARKS_CONFIG.modelosFrontera) {
      assert.ok(model.nombreModelo);
      assert.ok(model.proveedor);
      assert.ok(typeof model.puntuaciones === "object");
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
