import test from "node:test";
import assert from "node:assert";
import { resolverGeneracion } from "../../lib/server/generacion.js";

test("Caso 1: sin KHORA_SHELL (undefined), todo es vigente sin importar rutasOs", () => {
  const resultado = resolverGeneracion("/", undefined, new Set(["/"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 2: cadena vacía en shellEnv no es 'os'", () => {
  const resultado = resolverGeneracion("/", "", new Set(["/"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 3: mayúsculas en shellEnv ('OS') no activan — falla seguro, no falla abierto", () => {
  const resultado = resolverGeneracion("/", "OS", new Set(["/"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 4: espacio en la variable de entorno (' os') no activa — falla seguro", () => {
  const resultado = resolverGeneracion("/", " os", new Set(["/"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 5: caso base, shellEnv='os' y la ruta está declarada en rutasOs", () => {
  const resultado = resolverGeneracion("/", "os", new Set(["/"]));
  assert.strictEqual(resultado, "os");
});

test("Caso 6: pathname='/os' ya está en el árbol de destino, no se reescribe dos veces", () => {
  const resultado = resolverGeneracion("/os", "os", new Set(["/os"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 7: pathname='/os/' startsWith('/os') también atrapa el slash final", () => {
  const resultado = resolverGeneracion("/os/", "os", new Set(["/os"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 8: ruta '/nucleo' no declarada en rutasOs ({'/'}), aunque el shell esté activo", () => {
  const resultado = resolverGeneracion("/nucleo", "os", new Set(["/"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 9: sin slash final en rutasOs ({'/nucleo'}) para '/nucleo/' -> no hay match; cero normalización", () => {
  const resultado = resolverGeneracion("/nucleo/", "os", new Set(["/nucleo"]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 10: rutasOs con múltiples entradas ({'/', '/nucleo'}), ambas activas de forma independiente", () => {
  const resultado = resolverGeneracion("/nucleo", "os", new Set(["/", "/nucleo"]));
  assert.strictEqual(resultado, "os");
});

test("Caso 11: pathname '' vacío es un caso defensivo, resuelve a vigente y no revienta", () => {
  const resultado = resolverGeneracion("", "os", new Set([""]));
  assert.strictEqual(resultado, "vigente");
});

test("Caso 12: rutasOs vacío nunca activa nada, ni con el shell prendido", () => {
  const resultado = resolverGeneracion("/", "os", new Set());
  assert.strictEqual(resultado, "vigente");
});
