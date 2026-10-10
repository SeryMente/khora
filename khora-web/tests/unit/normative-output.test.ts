import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_OUTPUT_FORMAT_VERSION,
  hashCanonicalCycleOutput,
  renderCanonicalCycleOutput,
  validateCanonicalCycleOutput,
} from "../../lib/server/normative-output";

const expectedSiHeader = "SI CARGADO · v1.6.12 — Continuidad de Publicación Vercel por Cuenta Secundaria · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: hace 1 minuto | 2026-10-08";
const expectedMethodologyHeader = "METODOLOGÍA CARGADA · v0.13.0 — Continuidad de Publicación Vercel por Cuenta Secundaria · COMPLETA · ACTIVA · ÚLTIMO CAMBIO: hace 1 minuto | 2026-10-08";

function sampleData() {
  return {
    cycle: "KHORA / CONV-01 / C001",
    si_header: expectedSiHeader,
    methodology_header: expectedMethodologyHeader,
    ci: "✓" as const,
    ra: "INICIAL" as const,
    ubic: "CECEQ",
    rdc: "SI" as const,
    account: "blacksheepsup@gmail.com",
    rdc_use: "10% usado / 90% restante",
    session: "ACTIVA" as const,
    f: "✓" as const,
    k: "✓" as const,
    t: "✓" as const,
    rdc_cnx: "ONLINE · PC-7",
    usr: "fila4",
    result: "Contrato validado y liberado.",
    state: "COMPLETADO" as const,
  };
}

test("uses the local canonical contract version", () => {
  assert.equal(CANONICAL_OUTPUT_FORMAT_VERSION, "v1.7.7");
});

test("renders and validates the exact six-line canonical output", () => {
  const output = renderCanonicalCycleOutput(sampleData());
  const validation = validateCanonicalCycleOutput(output, { expectedSiHeader, expectedMethodologyHeader });
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.data, sampleData());
  assert.equal(output.split("\n").length, 6);
  assert.equal(output.endsWith("\n"), false);
});

test("rejects extra text, line count drift, bad states and non-canonical renderings", () => {
  const output = renderCanonicalCycleOutput(sampleData());
  assert.equal(validateCanonicalCycleOutput("prefix\n" + output, { expectedSiHeader, expectedMethodologyHeader }).ok, false);
  assert.equal(validateCanonicalCycleOutput(output + "\nsuffix", { expectedSiHeader, expectedMethodologyHeader }).ok, false);
  assert.equal(validateCanonicalCycleOutput(output.replace("CI: ✓", "CI: X"), { expectedSiHeader, expectedMethodologyHeader }).ok, false);
  assert.equal(validateCanonicalCycleOutput(output.replace("RA: INICIAL", "RA: UNKNOWN"), { expectedSiHeader, expectedMethodologyHeader }).ok, false);
  assert.equal(validateCanonicalCycleOutput(output.replace("ESTADO: COMPLETADO", "ESTADO: UNKNOWN"), { expectedSiHeader, expectedMethodologyHeader }).ok, false);
  assert.equal(validateCanonicalCycleOutput(output.replace(" · K: ✓ · T: ✓", " · EXTRA: 1 · K: ✓ · T: ✓"), { expectedSiHeader, expectedMethodologyHeader }).ok, false);
});

test("hash is exact and deterministic", () => {
  const output = renderCanonicalCycleOutput(sampleData());
  assert.match(hashCanonicalCycleOutput(output), /^[a-f0-9]{64}$/);
  assert.equal(hashCanonicalCycleOutput(output), hashCanonicalCycleOutput(output));
});
