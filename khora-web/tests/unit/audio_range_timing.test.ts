// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import assert from "assert";
import test from "node:test";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting } from "../../lib/server/neon";
import { interpolarPalabrasDeSegmentos, SegmentoWhisper } from "../../lib/server/transcribir";

test("Audio Range & Word Timing Backend", async (t) => {
  setDbForTesting({
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
  } as any);

  await t.test("interpolarPalabrasDeSegmentos genera marcas temporales aproximadas correctamente", () => {
    const texto = "El operador revisa la transcripción de Khora";
    const segmentos: SegmentoWhisper[] = [
      {
        start: 0,
        end: 3.5,
        start_ms_global: 0,
        end_ms_global: 3500,
        text: "El operador revisa la transcripción de Khora",
      },
    ];

    const palabras = interpolarPalabrasDeSegmentos(texto, segmentos, 1);

    assert.strictEqual(palabras.length, 7);
    assert.strictEqual(palabras[0].palabra, "El");
    assert.strictEqual(palabras[0].start_ms, 0);
    assert.strictEqual(palabras[0].fuente_timing, "segment_interpolated");
    assert.ok(palabras[0].confianza < 1.0);
    assert.strictEqual(palabras[6].palabra, "Khora");
    assert.strictEqual(palabras[6].end_ms, 3500);
  });
});
