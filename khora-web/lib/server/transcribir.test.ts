// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import test from "node:test";
import assert from "node:assert";
import {
  construirPromptSTT,
  reconciliarTranscripcion,
  unirDosTranscriptsConOverlapTemporal,
  reconciliarSegmentos,
  SegmentoReconciliado
} from "./transcribir.js";

test("1. construirPromptSTT incluye términos clave del glosario", () => {
  const glosario = {
    "csec": "CSEC",
    "khora": "Khora",
  };
  const prompt = construirPromptSTT(glosario);
  assert.match(prompt, /CSEC/);
  assert.match(prompt, /Khora/);
});

test("2. reconciliarTranscripcion adopta la transcripción autoritativa sin duplicar ni borrar", () => {
  const preview = "hola esto es una prueba";
  const autoritativa = "Hola, esto es una prueba.";

  const res = reconciliarTranscripcion(preview, autoritativa);
  assert.strictEqual(res.reconciliado, true);
  assert.strictEqual(res.textoFinal, "Hola, esto es una prueba.");
});

test("3. reconciliarTranscripcion conserva preview si autoritativa falla o llega vacía", () => {
  const preview = "texto de previsualización borrador";
  const autoritativa = "";

  const res = reconciliarTranscripcion(preview, autoritativa);
  assert.strictEqual(res.reconciliado, false);
  assert.strictEqual(res.textoFinal, "texto de previsualización borrador");
});

test("4. Deduplicación por solapamiento temporal elimina texto repetido únicamente cuando existe intersección temporal", () => {
  const izq = "hasta donde pudo dilucidar mi conciencia";
  const der = "dilucidar mi conciencia como hombre";

  // Mismo intervalo temporal solapado (0-45000ms vs 43000-88000ms -> intersección 43000-45000ms)
  const resSolapado = unirDosTranscriptsConOverlapTemporal(
    izq,
    der,
    { start_ms: 0, end_ms: 45000 },
    { start_ms: 43000, end_ms: 88000 }
  );

  assert.strictEqual(resSolapado, "hasta donde pudo dilucidar mi conciencia como hombre");
});

test("5. Repetición oral real en intervalos temporales distintos se CONSERVA intacta (Invariante Temporal)", () => {
  const izq = "hasta donde pudo dilucidar mi conciencia";
  const der = "hasta donde pudo dilucidar mi conciencia";

  // Intervalos temporales distintos sin solapamiento (0-45000ms vs 60000-105000ms -> no intersección)
  const resRepeticionReal = unirDosTranscriptsConOverlapTemporal(
    izq,
    der,
    { start_ms: 0, end_ms: 45000 },
    { start_ms: 60000, end_ms: 105000 }
  );

  assert.strictEqual(resRepeticionReal, "hasta donde pudo dilucidar mi conciencia hasta donde pudo dilucidar mi conciencia");
});

test("6. reconciliarSegmentos respeta estrictamente los segmentos editados manualmente por el operador", () => {
  const segmentosExistentes: SegmentoReconciliado[] = [
    { id: "s1", texto: "Primer párrafo provisional.", estado: "provisional_asr" },
    { id: "s2", texto: "Segundo párrafo editado por el operador.", estado: "editado_manual", modificadoManualmente: true },
  ];

  const nuevoTextoWhisper = "Primer párrafo autoritativo Whisper.\n\nSegundo párrafo alterado por Whisper.";

  const res = reconciliarSegmentos(segmentosExistentes, nuevoTextoWhisper);

  assert.strictEqual(res.segmentos[0].texto, "Primer párrafo autoritativo Whisper.");
  assert.strictEqual(res.segmentos[1].texto, "Segundo párrafo editado por el operador.", "El segmento manual no debe ser sobrescrito");
  assert.strictEqual(res.segmentos[1].estado, "editado_manual");
});
