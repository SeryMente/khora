// @l0 L0-002-R · @req FIX-DICTADO/D1-D4
import test from "node:test";
import assert from "node:assert";
import {
  guardian,
  palabrasNormalizadas,
  obtenerGlosario,
  construirInstruccion,
} from "./pulido.js";
import { aplicarGlosario } from "../transcripcion/ensamblar";

test("1. Guardian Invariancia Lexical: Cambios RECHAZADOS", () => {
  // Cambiar una palabra por un sinónimo
  const resSinonimo = guardian("el perro corre", "el can corre");
  assert.strictEqual(resSinonimo.aceptado, false, "Sinónimo debe ser rechazado");
  assert.strictEqual(resSinonimo.texto, "el perro corre");
  assert.match(resSinonimo.motivo, /Invariancia lexical violada/);

  // Eliminar una palabra
  const resEliminar = guardian("el perro corre rapido", "el perro corre");
  assert.strictEqual(resEliminar.aceptado, false, "Eliminación de palabra debe ser rechazada");

  // Agregar una palabra
  const resAgregar = guardian("el perro corre", "el perro corre muy rapido");
  assert.strictEqual(resAgregar.aceptado, false, "Adición de palabra debe ser rechazada");

  // Reordenar palabras
  const resReordenar = guardian("el perro corre", "corre el perro");
  assert.strictEqual(resReordenar.aceptado, false, "Reordenamiento de palabras debe ser rechazado");
});

test("2. Guardian Invariancia Lexical: Cambios ACEPTADOS", () => {
  // Añadir punto
  const resPunto = guardian("hola mundo", "hola mundo.");
  assert.strictEqual(resPunto.aceptado, true, "Añadir punto debe ser aceptado");

  // Añadir coma
  const resComa = guardian("hola amigo mio", "hola, amigo mio.");
  assert.strictEqual(resComa.aceptado, true, "Añadir coma debe ser aceptado");

  // Corregir mayúscula
  const resMayus = guardian("hola mundo", "Hola Mundo.");
  assert.strictEqual(resMayus.aceptado, true, "Corregir mayúscula debe ser aceptado");

  // Corregir tilde
  const resTilde = guardian("esta bien", "Está bien.");
  assert.strictEqual(resTilde.aceptado, true, "Corregir tilde debe ser aceptado");

  // Separar en párrafos
  const resParrafos = guardian("hola mundo feliz dia", "Hola mundo.\n\nFeliz día.");
  assert.strictEqual(resParrafos.aceptado, true, "Separar en párrafos debe ser aceptado");

  // Aplicar sustitución explícita del glosario
  const dummyGlosario = { "agente de ia": "agente de IA", "vercel": "Vercel" };
  const resGlosario = guardian("el agente de ia esta en vercel", "El agente de IA está en Vercel.", dummyGlosario);
  assert.strictEqual(resGlosario.aceptado, true, "Sustitución explícita de glosario debe ser aceptada");
});

test("4. Los terminos del glosario sobreviven al pulido sin deformarse", () => {
  const glosario = obtenerGlosario();

  // Verificar que el glosario cargado contiene los términos requeridos
  assert.ok(glosario["csec"], "Debe contener csec");
  assert.strictEqual(glosario["csec"], "CSEC");
  assert.strictEqual(glosario["khora"], "Khora");
  assert.strictEqual(glosario["github pages"], "GitHub Pages");
  assert.strictEqual(glosario["iar"], "IAR");
  assert.strictEqual(glosario["ideacion asincrona recuperable"], "ideación asíncrona recuperable");
  assert.strictEqual(glosario["agente de ia"], "agente de IA");
  assert.strictEqual(glosario["neo4j"], "Neo4j");
  assert.strictEqual(glosario["vercel"], "Vercel");
  assert.strictEqual(glosario["jules"], "Jules");

  // Verificar que aplicarGlosario funciona de manera integrada
  const textoCrudo = "ayer use github pages con iar y vercel para desplegar el agente de ia jules";
  const textoProcesado = aplicarGlosario(textoCrudo, glosario);

  assert.strictEqual(
    textoProcesado,
    "ayer use GitHub Pages con IAR y Vercel para desplegar el agente de IA Jules"
  );
});

test("5. construirInstruccion genera un prompt que incluye los terminos del glosario", () => {
  const glosarioDummy = {
    "csec": "CSEC",
    "jules": "Jules",
  };

  const instruccion = construirInstruccion(glosarioDummy);
  assert.match(instruccion, /"csec" -> "CSEC"/);
  assert.match(instruccion, /"jules" -> "Jules"/);
  assert.match(instruccion, /Es obligatorio aplicar este glosario/);
});
