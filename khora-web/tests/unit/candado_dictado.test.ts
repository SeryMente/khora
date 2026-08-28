// @l0 L0-002-R · @req FIX-DICTADO/D12
import test from "node:test";
import assert from "node:assert/strict";
import { evaluarCoberturaYReconciliar } from "../../lib/transcripcion/reconciliar";

test("D12 (1): Reconstrucción idéntica -> aceptado===true, deficit===0", () => {
  const ant = "este es un texto de prueba completamente identico";
  const nuev = "este es un texto de prueba completamente identico";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, true);
  assert.equal(res.deficit, 0);
  assert.equal(res.perdidaDetectada, false);
});

test("D12 (2): Truncado de cola -> aceptado===false, textoResultado === anterior (íntegro), perdidaDetectada===true", () => {
  const ant = "este es un texto largo que tiene una continuacion muy importante que sigue al final del dictado";
  const nuev = "este es un texto largo que tiene una continuacion";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, false);
  assert.equal(res.textoResultado, ant);
  assert.equal(res.perdidaDetectada, true);
});

test("D12 (3): Corrección de UNA palabra en frase corta ('jora' -> 'khora') -> aceptado===true, deficit===0, textoResultado===nuevo", () => {
  const ant = "estamos hablando de jora y del grafo de conocimiento";
  const nuev = "estamos hablando de khora y del grafo de conocimiento";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, true);
  assert.equal(res.deficit, 0);
  assert.equal(res.textoResultado, nuev);
  assert.equal(res.perdidaDetectada, false);
});

test("D12 (4): Varias correcciones dispersas (misma longitud, palabras distintas) -> aceptado===true, deficit===0", () => {
  const ant = "el sistema jora procesa la informacion con rapidez y precision";
  const nuev = "el sistema khora procesa la informacion con agilidad y exactitud";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, true);
  assert.equal(res.deficit, 0);
  assert.equal(res.textoResultado, nuev);
  assert.equal(res.perdidaDetectada, false);
});

test("D12 (5): Borrado de cláusula interna anclado -> aceptado===true, fusionado===true, textoResultado incluye 'leche' y 'huevos'", () => {
  const ant = "tenemos que comprar pan leche huevos y despues ir a la casa";
  const nuev = "tenemos que comprar pan y despues ir a la casa";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, true);
  assert.equal(res.fusionado, true);
  assert.equal(res.perdidaDetectada, true);
  assert.ok(res.textoResultado.includes("leche"));
  assert.ok(res.textoResultado.includes("huevos"));
});

test("D12 (6): 'yo digo digo lo que pienso' idéntico -> dos ocurrencias de 'digo' sobreviven", () => {
  const ant = "yo digo digo lo que pienso sobre este tema";
  const nuev = "yo digo digo lo que pienso sobre este tema";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, true);
  assert.equal(res.deficit, 0);
  const coincidencias = res.textoResultado.match(/\bdigo\b/g);
  assert.equal(coincidencias ? coincidencias.length : 0, 2);
});

test("D12 (7): nuevo==='' -> aceptado===false, textoResultado===anterior, perdidaDetectada===true", () => {
  const ant = "texto previamente capturado por el usuario";
  const nuev = "";
  const res = evaluarCoberturaYReconciliar(ant, nuev);

  assert.equal(res.aceptado, false);
  assert.equal(res.textoResultado, ant);
  assert.equal(res.perdidaDetectada, true);
});
