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

test("1. Un pulido que devuelve menos palabras se rechaza y se conserva el original", () => {
  const crudo = "hola buenos dias como estan todos ustedes hoy por aqui";
  const pulido = "hola buenos dias como estan todos ustedes hoy"; // Perdió "por aqui" (2 palabras menos)

  const resultado = guardian(crudo, pulido);

  assert.strictEqual(resultado.aceptado, false, "Debe ser rechazado");
  assert.strictEqual(resultado.texto, crudo, "Debe conservar el texto crudo original");
  assert.match(resultado.motivo, /numero de palabras alterado/, "Debe indicar la causa");
  assert.strictEqual(resultado.motivoRechazo, resultado.motivo, "motivoRechazo debe ser igual a motivo");
});

test("2. Un pulido que solo añade puntuacion y corrige ortografía se acepta", () => {
  const crudo = "hola buenos dias como estan todos";
  const pulido = "¡Hola! Buenos días, ¿cómo están todos?"; // Añade signos y tildes/mayúsculas, mismo conteo

  const resultado = guardian(crudo, pulido);

  assert.strictEqual(resultado.aceptado, true, "Debe ser aceptado");
  assert.strictEqual(resultado.texto, pulido, "Debe retornar el texto pulido");
  assert.strictEqual(resultado.motivo, "ok");
  assert.strictEqual(resultado.motivoRechazo, null);
});

test("3. Un pulido con aumento de hasta 2 palabras se acepta, pero mas de 2 se rechaza", () => {
  const crudo = "voy al grano"; // 3 palabras

  // Aumento de 1 palabra (p. ej. separación de contracción)
  const pulidoAceptable = "voy a el grano"; // 4 palabras (+1)
  const res1 = guardian(crudo, pulidoAceptable);
  assert.strictEqual(res1.aceptado, true, "Debe aceptar un incremento de 1 palabra");
  assert.strictEqual(res1.texto, pulidoAceptable);

  // Aumento de 2 palabras
  const pulidoAceptable2 = "yo voy a el grano"; // 5 palabras (+2)
  const res2 = guardian(crudo, pulidoAceptable2);
  assert.strictEqual(res2.aceptado, true, "Debe aceptar un incremento de 2 palabras");

  // Aumento de 3 palabras (más de la tolerancia de 2)
  const pulidoExcesivo = "yo voy a el gran grano"; // 6 palabras (+3)
  const res3 = guardian(crudo, pulidoExcesivo);
  assert.strictEqual(res3.aceptado, false, "Debe rechazar un incremento de más de 2 palabras");
  assert.strictEqual(res3.texto, crudo);
  assert.match(res3.motivo, /numero de palabras alterado/);
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
