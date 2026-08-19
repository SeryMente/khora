// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.X_KHORA_KEY = "0123456789abcdef0123456789abcdef";

import { setDbForTesting } from "../../lib/server/neon";
import { interpolarPalabrasDeSegmentos, SegmentoWhisper } from "../../lib/server/transcribir";

describe("Audio Range & Word Timing Backend", () => {
  beforeEach(() => {
    setDbForTesting({
      query: vi.fn(async () => ({ rows: [] })),
      connect: vi.fn(async () => ({ query: vi.fn(async () => ({ rows: [] })), release: vi.fn() })),
    } as any);
  });

  it("interpolarPalabrasDeSegmentos genera marcas temporales aproximadas correctamente", () => {
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

    expect(palabras.length).toBe(7);
    expect(palabras[0].palabra).toBe("El");
    expect(palabras[0].start_ms).toBe(0);
    expect(palabras[0].fuente_timing).toBe("segment_interpolated");
    expect(palabras[0].confianza).toBeLessThan(1.0);
    expect(palabras[6].palabra).toBe("Khora");
    expect(palabras[6].end_ms).toBe(3500);
  });
});
