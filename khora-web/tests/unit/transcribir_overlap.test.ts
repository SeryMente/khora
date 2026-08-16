// @l0 L0-002-R · @req FIX-DICTADO/OVERLAP-DEDUPLICATION
import test from "node:test";
import assert from "node:assert";
import {
  unirDosTranscriptsConOverlap,
  unirTranscriptsConOverlap,
} from "../../lib/server/transcribir.js";

test("unirDosTranscriptsConOverlap deduplica el solapamiento de palabras de forma determinista", () => {
  const chunk1 = "No quiero cambiar la forma en que funciona el sistema porque la experiencia";
  const chunk2 = "funciona el sistema porque la experiencia actual es buena y quiero mejorar su precisión.";

  const resultado = unirDosTranscriptsConOverlap(chunk1, chunk2);
  assert.strictEqual(
    resultado,
    "No quiero cambiar la forma en que funciona el sistema porque la experiencia actual es buena y quiero mejorar su precisión."
  );
});

test("unirDosTranscriptsConOverlap maneja superposición exacta con puntuación y mayúsculas variadas", () => {
  const chunk1 = "Groq Whisper produce la transcripción autoritativa de Khora";
  const chunk2 = "transcripción autoritativa de KHORA y elimina las duplicaciones por solapamiento.";

  const resultado = unirDosTranscriptsConOverlap(chunk1, chunk2);
  assert.strictEqual(
    resultado,
    "Groq Whisper produce la transcripción autoritativa de Khora y elimina las duplicaciones por solapamiento."
  );
});

test("unirDosTranscriptsConOverlap si no hay solapamiento concatena limpiamente", () => {
  const chunk1 = "Primera frase del dictado.";
  const chunk2 = "Segunda frase del dictado.";

  const resultado = unirDosTranscriptsConOverlap(chunk1, chunk2);
  assert.strictEqual(resultado, "Primera frase del dictado. Segunda frase del dictado.");
});

test("unirTranscriptsConOverlap deduplica una secuencia de múltiples chunks de audio", () => {
  const chunks = [
    "El sistema Khora procesa el audio en partes,",
    "procesa el audio en partes, permitiendo un dictado continuo",
    "permitiendo un dictado continuo sin perder el hilo discursivo.",
  ];

  const resultado = unirTranscriptsConOverlap(chunks);
  assert.strictEqual(
    resultado,
    "El sistema Khora procesa el audio en partes, permitiendo un dictado continuo sin perder el hilo discursivo."
  );
});
