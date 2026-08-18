// @l0 L0-002-R · @req FIX-DICTADO/D3-D4

import test from "node:test";
import assert from "node:assert";
import {
  ensamblarParrafos,
  ensamblarParrafosEstructurado,
  aplicarGlosario,
} from "./ensamblar.js";
import type { Fragmento } from "./ensamblar.js";

function contarPalabras(texto: string): number {
  const matches = texto.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

test("1. Tres fragmentos con pausas cortas producen UN solo párrafo.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: "buenos", pausaMsAntes: 200 },
    { texto: "días", pausaMsAntes: 500 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Hola buenos días");
  assert.ok(!resultado.includes("\n"));
});

test("2. Pausa de 4000 ms dentro de una oración NUNCA produce dos párrafos (Invariante Silencio Auxiliar).", () => {
  const fragmentos: Fragmento[] = [
    { texto: "Quiero revisar el sistema de memoria", pausaMsAntes: 0 },
    { texto: "para asegurar que la estructura funciona bien", pausaMsAntes: 4000 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 1, "La pausa por sí sola jamás debe crear un salto de párrafo");
  assert.strictEqual(
    resultado,
    "Quiero revisar el sistema de memoria para asegurar que la estructura funciona bien"
  );
});

test("3. Pausa de 12000 ms con conector subordinante ('porque') mantiene UN solo párrafo.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "No queremos modificar la arquitectura actual", pausaMsAntes: 0 },
    { texto: "porque la experiencia de usuario ha sido sólida", pausaMsAntes: 12000 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 1);
  assert.strictEqual(
    resultado,
    "No queremos modificar la arquitectura actual porque la experiencia de usuario ha sido sólida"
  );
});

test("4. La repetición oral o palabra repetida aparece el número exacto de veces que fue dicha.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "digo", pausaMsAntes: 0 },
    { texto: "digo", pausaMsAntes: 100 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Digo digo");

  const matches = resultado.match(/digo/gi);
  assert.strictEqual(matches?.length, 2);
});

test("5. La suma de palabras de entrada es exactamente igual a la de salida (Invariante de No-Pérdida).", () => {
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

  assert.strictEqual(palabrasSalida, palabrasEntrada, "La suma de palabras debe ser idéntica");
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

test("7. Normalización de espacios antes de signos de puntuación.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "hola", pausaMsAntes: 0 },
    { texto: " , qué tal", pausaMsAntes: 100 },
    { texto: " ?", pausaMsAntes: 100 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.strictEqual(resultado, "Hola, qué tal?");
});

test("8. Manejo de array vacío de fragmentos.", () => {
  const resultado = ensamblarParrafos([]);
  assert.strictEqual(resultado, "");
});

test("9. Una sola idea con varias pausas artificiales produce UN solo párrafo (Escenario A).", () => {
  const fragmentos: Fragmento[] = [
    { texto: "No quiero cambiar la forma en que funciona el sistema", pausaMsAntes: 0 },
    { texto: "porque la experiencia actual es buena", pausaMsAntes: 4500 },
    { texto: "pero quiero mejorar su precisión.", pausaMsAntes: 5000 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 1, "Debe ser un único párrafo sin divisiones artificiales");
  assert.strictEqual(
    resultado,
    "No quiero cambiar la forma en que funciona el sistema porque la experiencia actual es buena pero quiero mejorar su precisión."
  );
});

test("10. Dos ideas independientes con punto de cierre y pausa corta producen DOS párrafos (Escenario B).", () => {
  const fragmentos: Fragmento[] = [
    { texto: "Quiero mejorar el reconocimiento.", pausaMsAntes: 0 },
    { texto: "También quiero mejorar la revisión.", pausaMsAntes: 1200 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");
  assert.strictEqual(parrafos.length, 2, "Debe separar en dos párrafos debido a la clausura terminal explícita");
  assert.strictEqual(parrafos[0], "Quiero mejorar el reconocimiento.");
  assert.strictEqual(parrafos[1], "También quiero mejorar la revisión.");
});

test("11. Autocorrecciones ('Corrijo') permanecen en la misma unidad discursiva sin eliminar el texto previo.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "La misión principal es la agilidad...", pausaMsAntes: 0 },
    { texto: "Corrijo, la visión principal es la precisión.", pausaMsAntes: 1500 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  const parrafos = resultado.split("\n\n");

  assert.strictEqual(parrafos.length, 1, "La autocorrección debe agruparse con la unidad discursiva que corrige");
  assert.ok(resultado.includes("misión"));
  assert.ok(resultado.includes("Corrijo"));
  assert.ok(resultado.includes("visión"));
});

test("12. Conector discursivo ('Sin embargo') no produce un párrafo aislado automáticamente.", () => {
  const fragmentos: Fragmento[] = [
    { texto: "El sistema actual funciona de manera muy fluida.", pausaMsAntes: 0 },
    { texto: "Sin embargo todavía requiere mayor precisión en la segmentación.", pausaMsAntes: 800 },
  ];

  const resultado = ensamblarParrafos(fragmentos);
  assert.ok(
    resultado.includes("El sistema actual funciona de manera muy fluida. Sin embargo todavía requiere mayor precisión"),
    "El conector no debe quedar aislado en un párrafo aparte"
  );
});

test("13. Salvaguarda de longitud divide párrafos al superar el objetivo de palabras en un límite seguro.", () => {
  const muchasPalabras = Array(190).fill("palabra").join(" ") + ".";
  const fragmentos: Fragmento[] = [
    { texto: muchasPalabras, pausaMsAntes: 0 },
    { texto: "Esta es una nueva oración independiente.", pausaMsAntes: 1000 },
  ];

  const resultadoEstructurado = ensamblarParrafosEstructurado(fragmentos, { maxPalabrasObjetivo: 180 });
  assert.strictEqual(resultadoEstructurado.parrafos.length, 2);
  assert.strictEqual(resultadoEstructurado.motivosLimites[0].motivo, "longitud_segura");
});
