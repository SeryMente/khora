// @l0 L0-002-R · @req FIX-DICTADO/CLEAN-VERBATIM-TESTS
import test from "node:test";
import assert from "node:assert";
import { ensamblarParrafos, Fragmento, aplicarGlosario } from "../../lib/transcripcion/ensamblar.js";
import { guardian, palabrasNormalizadas } from "../../lib/server/pulido.js";
import { reconciliarTranscripcion } from "../../lib/server/transcribir.js";

test("Prueba 1: Una frase corta con pausas", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola buenos días", pausaMsAntes: 0 },
    { texto: "cómo están todos", pausaMsAntes: 1200 },
  ];

  const ensamblado = ensamblarParrafos(fragmentos, { umbralMs: 3500 });
  assert.strictEqual(ensamblado, "Hola buenos días cómo están todos");
  assert.ok(!ensamblado.includes("\n\n"), "No debe crear salto de párrafo por pausa corta");

  const guard = guardian("hola buenos días cómo están todos", ensamblado);
  assert.strictEqual(guard.aceptado, true);
});

test("Prueba 2: Una idea larga con pausas intermedias", () => {
  const fragmentos: Fragmento[] = [
    { texto: "estamos registrando un dictado largo", pausaMsAntes: 0 },
    { texto: "donde el operador hace pequeñas pausas", pausaMsAntes: 1500 },
    { texto: "para pensar su siguiente frase", pausaMsAntes: 2000 },
  ];

  const ensamblado = ensamblarParrafos(fragmentos, { umbralMs: 3500 });
  assert.strictEqual(
    ensamblado,
    "Estamos registrando un dictado largo donde el operador hace pequeñas pausas para pensar su siguiente frase"
  );
  assert.strictEqual(ensamblado.split("\n\n").length, 1, "Debe permanecer en un solo bloque");
});

test("Prueba 3: Dos ideas consecutivas separadas por pausa mayor", () => {
  const fragmentos: Fragmento[] = [
    { texto: "esta es la primera idea completa.", pausaMsAntes: 0 },
    { texto: "esta es la segunda idea distinta.", pausaMsAntes: 4000 },
  ];

  const ensamblado = ensamblarParrafos(fragmentos, { umbralMs: 3500 });
  const parrafos = ensamblado.split("\n\n");
  assert.strictEqual(parrafos.length, 2, "Debe separar en dos párrafos por pausa >= 3500ms");
  assert.strictEqual(parrafos[0], "Esta es la primera idea completa.");
  assert.strictEqual(parrafos[1], "Esta es la segunda idea distinta.");
});

test("Prueba 4: Nombres propios y términos del glosario", () => {
  const glosario = { "csec": "CSEC", "khora": "Khora", "iar": "IAR" };
  const crudo = "el operador de khora envio el informe csec con iar";
  const conGlosario = aplicarGlosario(crudo, glosario);

  assert.strictEqual(conGlosario, "el operador de Khora envio el informe CSEC con IAR");

  const guard = guardian(crudo, "El operador de Khora envió el informe CSEC con IAR.", glosario);
  assert.strictEqual(guard.aceptado, true, "La sustitución del glosario es una normalización autorizada aceptada");
});

test("Prueba 5: Texto con repetición explícita (se conserva íntegramente)", () => {
  const fragmentos: Fragmento[] = [
    { texto: "digo digo que sí", pausaMsAntes: 0 },
  ];

  const ensamblado = ensamblarParrafos(fragmentos);
  assert.strictEqual(ensamblado, "Digo digo que sí");

  const guard = guardian("digo digo que si", "Digo digo que sí.");
  assert.strictEqual(guard.aceptado, true, "No debe eliminar repeticiones del hablante");
});

test("Prueba 6: Caso en que Groq esté indisponible (fallback grace)", () => {
  const previewASR = "Hola esto es la previsualización del navegador.";
  const autoritativaVacia = "";

  const rec = reconciliarTranscripcion(previewASR, autoritativaVacia);
  assert.strictEqual(rec.reconciliado, false);
  assert.strictEqual(rec.textoFinal, previewASR, "Debe conservar la previsualización ASR intacta sin desplomarse");
});
