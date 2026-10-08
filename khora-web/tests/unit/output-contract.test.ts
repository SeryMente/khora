import test from "node:test";
import assert from "node:assert/strict";

import {
  OUTPUT_FORMAT_VERSION,
  parseCanonicalCycleOutput,
  renderCanonicalCycleOutput,
  sha256Output,
} from "../../lib/server/output-contract";

const siHeader = "SI CARGADO · v1.6.8 — Continuidad Canónica entre Conversaciones · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: hace 1 minuto | 2026-10-08";
const methodologyHeader = "METODOLOGÍA CARGADA · v0.12.2 — Verificación del Régimen Personalizado · COMPLETA · ACTIVA · ÚLTIMO CAMBIO: hace 1 minuto | 2026-10-08";

function base(overrides: Partial<Parameters<typeof renderCanonicalCycleOutput>[0]> = {}) {
  return {
    cycle: "PROYECTO / CONV-01 / C001",
    siHeader,
    methodologyHeader,
    ci: "✓" as const,
    ubic: "CECEQ",
    rdc: "NO" as const,
    cuenta: "NO DISPONIBLE",
    usoUsado: "0",
    usoRestante: "100",
    sesion: "NO VERIFICADA" as const,
    frescura: "✓" as const,
    khora: "OFF" as const,
    thinking: "?" as const,
    rdcCnx: "NO REQUERIDA",
    usr: "fila4",
    resultado: "Resultado suficiente.",
    estado: "COMPLETADO" as const,
    ...overrides,
  };
}

test("contract version is locked", () => {
  assert.equal(OUTPUT_FORMAT_VERSION, "v1.7.5");
});

test("renderer emits exactly the canonical six-line format", () => {
  const output = renderCanonicalCycleOutput(base());
  assert.equal(output.split("\n").length, 6);
  assert.equal(parseCanonicalCycleOutput(output, siHeader, methodologyHeader).estado, "COMPLETADO");
});

test("parser rejects any extra line", () => {
  const output = renderCanonicalCycleOutput(base()) + "\ntexto extra";
  assert.throws(() => parseCanonicalCycleOutput(output, siHeader, methodologyHeader), /OUTPUT_LINE_COUNT_INVALID/);
});

test("parser rejects missing CI field", () => {
  const output = renderCanonicalCycleOutput(base()).replace(" · CI: ✓", "");
  assert.throws(() => parseCanonicalCycleOutput(output, siHeader, methodologyHeader), /OUTPUT_HUD_FORMAT_INVALID/);
});

test("parser rejects reordered HUD fields", () => {
  const output = renderCanonicalCycleOutput(base()).replace(" · RDC: NO · C:", " · C: NO DISPONIBLE · RDC:");
  assert.throws(() => parseCanonicalCycleOutput(output, siHeader, methodologyHeader), /OUTPUT_HUD_FORMAT_INVALID/);
});

test("parser rejects an invalid CI state", () => {
  const output = renderCanonicalCycleOutput(base()).replace("CI: ✓", "CI: MAYBE");
  assert.throws(() => parseCanonicalCycleOutput(output, siHeader, methodologyHeader), /OUTPUT_HUD_FORMAT_INVALID/);
});

test("renderer and hash are deterministic", () => {
  const a = renderCanonicalCycleOutput(base());
  const b = renderCanonicalCycleOutput(base());
  assert.equal(a, b);
  assert.equal(sha256Output(a), sha256Output(b));
});

test("blocked output must use the exact preamble variant", () => {
  const output = renderCanonicalCycleOutput(base({
    rdc: "SI",
    estado: "BLOQUEADO",
    bloqueado: { motivo: "RDC requerido.", rdc: "REQUERIDA" },
  }));
  const parsed = parseCanonicalCycleOutput(output, siHeader, methodologyHeader);
  assert.equal(parsed.estado, "BLOQUEADO");
  assert.equal(parsed.bloqueado?.rdc, "REQUERIDA");
});

test("blocked state without preamble is rejected", () => {
  const output = renderCanonicalCycleOutput(base()).replace("ESTADO: COMPLETADO", "ESTADO: BLOQUEADO");
  assert.throws(() => parseCanonicalCycleOutput(output, siHeader, methodologyHeader), /OUTPUT_BLOCK_PREAMBLE_MISSING/);
});
