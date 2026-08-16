// @l0 L0-002-R · @req FIX-DICTADO/AUTHORITATIVE-STT
import test from "node:test";
import assert from "node:assert";
import { construirPromptSTT, reconciliarTranscripcion } from "./transcribir.js";

test("1. construirPromptSTT incluye terminos clave del glosario", () => {
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

test("3. reconciliarTranscripcion conserva preview si autoritativa falla o llega vacia", () => {
  const preview = "texto de previsualizacion borrador";
  const autoritativa = "";

  const res = reconciliarTranscripcion(preview, autoritativa);
  assert.strictEqual(res.reconciliado, false);
  assert.strictEqual(res.textoFinal, "texto de previsualizacion borrador");
});
