// @l0 L0-002-R · @req TILDES-AUTO/REQ-1
import assert from "assert";
import test from "node:test";
import { autoaplicarTildesSeguras } from "../../lib/server/tildesSeguras";

test("Tildes Seguras & Groq Suite", async (t) => {
  await t.test("1. autoaplicarTildesSeguras corrige formas obligatorias e inequívocas", () => {
    const original = "El codigo de la seccion tambien tiene una version valida.";
    const res = autoaplicarTildesSeguras(original);

    assert.strictEqual(res.cambioRealizado, true);
    assert.strictEqual(res.textoNuevo, "El código de la sección también tiene una versión valida.");
    assert.strictEqual(res.sustituciones.length, 4);
  });

  await t.test("2. autoaplicarTildesSeguras no autoaplica formas ambiguas (mas vs más, esta vs está)", () => {
    const ambiguo = "Esta persona mas no esta otra dijo que mas vale tarde que nunca.";
    const res = autoaplicarTildesSeguras(ambiguo);

    assert.strictEqual(res.cambioRealizado, false);
    assert.strictEqual(res.textoNuevo, ambiguo);
    assert.strictEqual(res.sustituciones.length, 0);
  });

  await t.test("3. idempotencia: ejecutar dos veces no altera el texto", () => {
    const texto = "Esta seccion tiene un codigo seguro y otro tambien.";
    const res1 = autoaplicarTildesSeguras(texto);
    const res2 = autoaplicarTildesSeguras(res1.textoNuevo);

    assert.strictEqual(res1.cambioRealizado, true);
    assert.strictEqual(res2.cambioRealizado, false);
    assert.strictEqual(res2.textoNuevo, res1.textoNuevo);
  });
});
