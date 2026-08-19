// @l0 L0-002-R · @req TITULOS-LLM/REQ-1
import assert from "assert";
import test from "node:test";
import {
  segmentarTextoEnChunks,
  generarTituloFallback,
  generarTituloEstructurado
} from "../../lib/server/titulos";

test("Titulos Suite", async (t) => {
  await t.test("1. segmentarTextoEnChunks divide párrafos largos sin cortar a los 4000 caracteres", () => {
    const p1 = "Párrafo 1 con contenido importante al inicio. ".repeat(20);
    const p2 = "Párrafo 2 con contenido relevante en el medio. ".repeat(20);
    const p3 = "Párrafo 3 con la idea central ubicada al final después del carácter cuatro mil. ".repeat(30);

    const textoLargo = `${p1}\n\n${p2}\n\n${p3}`;
    assert.ok(textoLargo.length > 4000);

    const chunks = segmentarTextoEnChunks(textoLargo, 2000);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[chunks.length - 1].includes("idea central ubicada al final"));
  });

  await t.test("2. generarTituloFallback produce título con grounding y sin comillas", () => {
    const texto = "En la reunión de infraestructura se acordó migrar la base de datos a PostgreSQL en Alta Disponibilidad antes de fin de mes.";
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length >= 5);
    assert.ok(resultado.title.length <= 140);
    assert.strictEqual(resultado.fallback_used, true);
    assert.ok(!resultado.title.includes('"'));
  });

  await t.test("3. generarTituloEstructurado con fallback sin API key", async () => {
    delete process.env.GROQ_API_KEY;
    const texto = "El operador Juan Pérez confirmó la resolución del incidente en el nodo central.";
    const res = await generarTituloEstructurado(texto);

    assert.ok(res.title);
    assert.strictEqual(res.fallback_used, true);
    assert.ok(res.threads.length > 0);
  });
});
