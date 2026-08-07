// @l0 L0-002-R · @req FIX-DICTADO/D3-D4

import test from "node:test";
import assert from "node:assert";
import {
  ensamblarParrafos,
  aplicarGlosario,
} from "./ensamblar.js";
import type { Fragmento } from "./ensamblar.js";

function contarPalabras(texto: string): number {
  const matches = texto.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

test("1. Tres fragmentos con pausas cortas producen UN párrafo.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "buenos", pausaMsAntes: 200 },
    { texto: "días", pausaMsAntes: 500 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Hola buenos días");
  assert.ok(!resultado.includes("\n"));
});

test("2. Pausa de 4000 ms produce DOS párrafos.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "cómo estás", pausaMsAntes: 4000 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 2);
  assert.strictEqual(parrafos[0], "Hola");
  assert.strictEqual(parrafos[1], "Cómo estás");
});

test("3. Un fragmento de una sola palabra tras pausa larga SÍ aparece en la salida.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "sí", pausaMsAntes: 3000 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 2);
  assert.strictEqual(parrafos[1], "Sí");
});

test("4. La palabra 'digo' repetida dos veces aparece DOS veces.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "digo", pausaMsAntes: 0 },
    { texto: "digo", pausaMsAntes: 100 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Digo digo");

  // Verificar conteo de palabras específicas
  const matches = resultado.match(/digo/gi);
  assert.strictEqual(matches?.length, 2);
});

test("5. La suma de palabras de entrada es igual a la de salida (invariante de no-pérdida).", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "esto es un", pausaMsAntes: 1000 },
    { texto: "test de invariabilidad,", pausaMsAntes: 3000 },
    { texto: "debería funcionar", pausaMsAntes: 100 },
    { texto: "perfectamente bien.", pausaMsAntes: 4000 },
  ];

  const palabrasEntrada = fragmentos.reduce(
    (acc, f) => acc + contarPalabras(f.texto),
    0
  );

  const resultado = ensamblarParrafos(fragmentos);
  const palabrasSalida = contarPalabras(resultado);

  assert.strictEqual(palabrasSalida, palabrasEntrada, "La suma de palabras debe ser exactly equal");
});

test("6. aplicarGlosario convierte 'se sec' en 'CSEC' y 'cora' en 'Khora', sin tocar 'corazón'.", () => {
  const glosario = {
    "se sec": "CSEC",
    "cora": "Khora",
  };

  const textoOriginal = "El cora de la organización se sec hoy, pero el corazón late fuerte.";
  const resultado = aplicarGlosario(textoOriginal, glosario);

  assert.strictEqual(
    resultado,
    "El Khora de la organización CSEC hoy, pero el corazón late fuerte."
  );
});

test("7. Normalización de espacios antes de signos de puntuación", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: " , qué tal", pausaMsAntes: 100 },
    { texto: " ?", pausaMsAntes: 100 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Hola, qué tal?");
});

test("8. Manejo de array vacío de fragmentos", () => {
  const resultado = ensamblarParrafos([]);
  assert.strictEqual(resultado, "");
});

test("9. Umbral personalizado de pausa en opciones", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "amigo", pausaMsAntes: 3000 },
  ];

  // Con umbral por defecto (2500 ms), debería separar
  const resultadoDefecto = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultadoDefecto.split("\n\n").length, 2);

  // Con umbral de 5000 ms, debería unir en un solo párrafo
  const resultadoPersonalizado = ensamblarParrafos(fragmentos, { umbralMs: 5000 });
  assert.strictEqual(resultadoPersonalizado.split("\n\n").length, 1);
  assert.strictEqual(resultadoPersonalizado, "Hola amigo");
});
