// @l0 L0-002 · @req LLM-LOCAL/TESTS · Pruebas unitarias para el perfil local Ollama
import "./setup";
import assert from "assert";
import test from "node:test";
import {
  generarPowerShellInstalacionOllama,
  calcularTpsOllama,
  verificarOllamaConectividad,
  diagnosticarConexionOllama,
  ejecutarInferenciaOllamaLocal,
  OllamaStreamChunk,
} from "../../lib/client/ollamaLocal";
import {
  MODEL_CATALOG_CONFIG,
  resolverModeloYVentanaLocal,
  parsearContextoTokensBinario,
} from "../../lib/config/model_catalog";

test("Perfil Local Suite - Inferencia Ollama, Script PowerShell y TPS", async (t) => {

  await t.test("1. Generación correcta de script PowerShell sin exponer $env:OLLAMA_ORIGINS='*'", () => {
    const origenProd = "https://khora-web.vercel.app";
    const modelo = "qwen3.8:27b";
    const script = generarPowerShellInstalacionOllama(modelo, origenProd);

    assert.ok(script.includes(`[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "${origenProd}", "User")`));
    assert.ok(script.includes(`$env:OLLAMA_ORIGINS = "${origenProd}"`));
    assert.ok(!script.includes('OLLAMA_ORIGINS", "*"'));
    assert.ok(script.includes(`ollama pull ${modelo}`));
    assert.ok(script.includes("winget install --id Ollama.Ollama"));
  });

  await t.test("2. Cálculo exacto de TPS a partir de eval_count y eval_duration (nanosegundos)", () => {
    // 50 tokens generados en 2,000,000,000 ns (2.0 segundos) = 25.0 tok/s
    const evalCount = 50;
    const evalDurationNs = 2000000000;
    const tps = calcularTpsOllama(evalCount, evalDurationNs);

    assert.strictEqual(tps, 25);

    // Casos nulos / no válidos
    assert.strictEqual(calcularTpsOllama(null, 1000), null);
    assert.strictEqual(calcularTpsOllama(10, null), null);
    assert.strictEqual(calcularTpsOllama(0, 1000), null);
    assert.strictEqual(calcularTpsOllama(10, 0), null);
  });

  await t.test("3. Diagnóstico de salud proactivo en 4 estados (no_instalado, sin_modelo, listo, error)", async () => {
    const originalFetch = globalThis.fetch;

    try {
      // Estado 1: no_instalado (puerto caído / red inalcanzable)
      globalThis.fetch = (async () => {
        throw new Error("Failed to fetch");
      }) as typeof fetch;

      const diagNoInstalado = await diagnosticarConexionOllama("qwen3.8:27b");
      assert.strictEqual(diagNoInstalado.estado, "no_instalado");
      assert.ok(diagNoInstalado.mensaje.includes("No se pudo conectar"));

      // Estado 2: sin_modelo (Ollama responde pero no tiene el modelo buscado)
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ models: [{ name: "llama2:latest" }] }), { status: 200 });
      }) as typeof fetch;

      const diagSinModelo = await diagnosticarConexionOllama("qwen3.8:27b");
      assert.strictEqual(diagSinModelo.estado, "sin_modelo");
      assert.deepStrictEqual(diagSinModelo.modelosInstalados, ["llama2:latest"]);

      // Estado 3: listo (Ollama responde y posee el modelo buscado)
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ models: [{ name: "qwen3.8:27b" }] }), { status: 200 });
      }) as typeof fetch;

      const diagListo = await diagnosticarConexionOllama("qwen3.8:27b");
      assert.strictEqual(diagListo.estado, "listo");

      // Estado 4: error (Ollama responde con HTTP 500)
      globalThis.fetch = (async () => {
        return new Response("Internal Error", { status: 500 });
      }) as typeof fetch;

      const diagError = await diagnosticarConexionOllama("qwen3.8:27b");
      assert.strictEqual(diagError.estado, "error");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("4. Inferencia con mock de respuesta NDJSON nativa de Ollama parsea chunks y calcula TPS", async () => {
    const chunksData: OllamaStreamChunk[] = [
      {
        model: "qwen3.8:27b",
        created_at: new Date().toISOString(),
        message: { role: "assistant", content: "Hola " },
        done: false,
      },
      {
        model: "qwen3.8:27b",
        created_at: new Date().toISOString(),
        message: { role: "assistant", content: "desde Khora local." },
        done: false,
      },
      {
        model: "qwen3.8:27b",
        created_at: new Date().toISOString(),
        done: true,
        done_reason: "stop",
        total_duration: 1500000000,
        load_duration: 100000000,
        prompt_eval_count: 5,
        prompt_eval_duration: 200000000,
        eval_count: 20,
        eval_duration: 1000000000, // 1.0 segundo -> TPS = 20
      },
    ];

    const ndjsonString = chunksData.map((c) => JSON.stringify(c)).join("\n");
    const encoder = new TextEncoder();

    // Mock global fetch para simular localhost:11434/api/chat
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/chat")) {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(ndjsonString));
            controller.close();
          },
        });
        return new Response(stream, { status: 200 });
      }
      return originalFetch(url, init);
    }) as typeof fetch;

    try {
      let chunksRecibidos = "";
      const resultado = await ejecutarInferenciaOllamaLocal({
        baseUrl: "http://localhost:11434",
        model: "qwen3.8:27b",
        messages: [{ role: "user", content: "Test" }],
        onChunk: (chunk, full) => {
          chunksRecibidos += chunk;
        },
      });

      assert.strictEqual(resultado.contenido, "Hola desde Khora local.");
      assert.strictEqual(chunksRecibidos, "Hola desde Khora local.");
      assert.strictEqual(resultado.evalCount, 20);
      assert.strictEqual(resultado.evalDurationNs, 1000000000);
      assert.strictEqual(resultado.tps, 20);
      assert.strictEqual(resultado.exactTokens, true);
      assert.strictEqual(resultado.origenModel, "ollama:qwen3.8:27b");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("5. No regresión: el perfil 'local' coexiste en model_catalog.ts sin alterar los otros 3", () => {
    const perfiles = MODEL_CATALOG_CONFIG.perfiles;
    assert.strictEqual(perfiles.length, 4);

    const ids = perfiles.map((p) => p.perfilId);
    assert.deepStrictEqual(ids, ["groq", "gemini", "open_source", "local"]);

    const localEntry = perfiles.find((p) => p.perfilId === "local");
    assert.ok(localEntry);
    assert.strictEqual(localEntry.motor, "ollama");
    assert.strictEqual(localEntry.requiereGPU, true);
    assert.strictEqual(localEntry.sinCredencial, true);
    assert.strictEqual(localEntry.modelosLocales?.length, 5);

    // Verificación (a): La entrada "local" NO posee modeloDefecto ni ventanaContextoTokens estáticos
    assert.strictEqual(localEntry.modeloDefecto, undefined);
    assert.strictEqual(localEntry.ventanaContextoTokens, undefined);
  });

  await t.test("6. Parseo binario de ventana de contexto en tokens reales (parsearContextoTokensBinario)", () => {
    assert.strictEqual(parsearContextoTokensBinario("128K"), 131072); // 128 * 1024
    assert.strictEqual(parsearContextoTokensBinario("256K"), 262144); // 256 * 1024
    assert.strictEqual(parsearContextoTokensBinario("—"), null);
    assert.strictEqual(parsearContextoTokensBinario(null), null);
    assert.strictEqual(parsearContextoTokensBinario(""), null);
  });

  await t.test("7. Resolución dinámica de modelo local (resolverModeloYVentanaLocal) en los 3 casos", () => {
    const localEntry = MODEL_CATALOG_CONFIG.perfiles.find((p) => p.perfilId === "local");
    const modelosLocales = localEntry?.modelosLocales || [];

    // Caso 1: Override manual por el usuario -> fuente "override"
    const resOverride = resolverModeloYVentanaLocal("gpt-oss:20b", ["qwen3-coder:30b"], modelosLocales);
    assert.strictEqual(resOverride.modeloResuelto, "gpt-oss:20b");
    assert.strictEqual(resOverride.ventanaContextoTokens, 131072);
    assert.strictEqual(resOverride.fuenteResolucion, "override");

    // Caso 2: Detectado por cruce entre modelosInstalados y tabla de catálogo -> fuente "detectado"
    // 'qwen3-coder:30b' aparece antes que 'qwen3.8:27b' en el catálogo si ambos están instalados
    const resDetectado = resolverModeloYVentanaLocal("", ["qwen3.8:27b", "qwen3-coder:30b"], modelosLocales);
    assert.strictEqual(resDetectado.modeloResuelto, "qwen3-coder:30b");
    assert.strictEqual(resDetectado.ventanaContextoTokens, 262144);
    assert.strictEqual(resDetectado.fuenteResolucion, "detectado");

    // Caso 3: Ningún modelo instalado coincide con el catálogo -> fuente "recomendado_no_instalado" (fallback explicit)
    const resRecomendado = resolverModeloYVentanaLocal("", ["modelo-desconocido:latest"], modelosLocales);
    assert.strictEqual(resRecomendado.modeloResuelto, "qwen3.8:27b");
    assert.strictEqual(resRecomendado.ventanaContextoTokens, 262144);
    assert.strictEqual(resRecomendado.fuenteResolucion, "recomendado_no_instalado");
  });

});
