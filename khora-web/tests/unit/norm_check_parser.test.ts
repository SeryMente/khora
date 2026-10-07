import test from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalMethodologyOutputHeader, buildCanonicalSiOutputHeader, parsePrinciples } from "@/lib/server/norm-check";

function principle(folio: string, preponderance: string, state = "CANÓNICO") {
  return `### ${folio} · Principio ${folio}

**Estado:** ${state}
**Índice de preponderancia:** ${preponderance}

Texto operativo.
`;
}

test("parser no depende de la sección 5 para delimitar el catálogo", () => {
  const source = [
    "# SI",
    "## Sección distinta",
    principle("P019", "0.97"),
    principle("P020", "0.99"),
    "## Sección posterior",
    "### P999 · No debe entrar",
    "**Estado:** PROPUESTO",
    "**Índice de preponderancia:** 0.01",
  ].join("\n");

  const manifest = parsePrinciples(source);

  assert.deepEqual(manifest.map((item) => item.folio), ["P020", "P019"]);
});

test("parser rechaza folios duplicados", () => {
  const source = [
    "## Principios",
    principle("P019", "0.97"),
    principle("P019", "0.97"),
  ].join("\n");

  assert.throws(() => parsePrinciples(source), /SI_PRINCIPLES_DUPLICATED:P019/);
});

test("parser rechaza principios sin estado canónico", () => {
  const source = [
    "## Principios",
    principle("P019", "0.97", "PROPUESTO"),
  ].join("\n");

  assert.throws(() => parsePrinciples(source), /SI_PRINCIPLE_STATE_INVALID:P019/);
});

test("parser rechaza preponderancia fuera del dominio 0..1", () => {
  const source = [
    "## Principios",
    principle("P019", "1.01"),
  ].join("\n");

  assert.throws(() => parsePrinciples(source), /SI_PREPONDERANCE_INVALID:P019/);
});


test("formato canónico del SI conserva identidad y antigüedad relativa", () => {
  const snapshot = {
    version: "v1.6.7",
    versionName: "Gobernanza Transaccional del Estado RDC",
    canonicalUpdatedAt: "2026-10-07T20:31:02.000Z",
  };

  assert.equal(
    buildCanonicalSiOutputHeader(snapshot, "2026-10-07T21:02:02.000Z"),
    "SI CARGADO · v1.6.7 — Gobernanza Transaccional del Estado RDC · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: hace 31 minutos | 2026-10-07",
  );
});

test("formato canónico cambia a horas y luego a fecha absoluta sin alterar la identidad", () => {
  const snapshot = {
    version: "v1.6.7",
    versionName: "Gobernanza Transaccional del Estado RDC",
    canonicalUpdatedAt: "2026-09-01T12:00:00.000Z",
  };

  assert.match(
    buildCanonicalSiOutputHeader(snapshot, "2026-09-01T14:00:00.000Z"),
    /ÚLTIMO CAMBIO: hace 2 horas \| 2026-09-01$/,
  );
  assert.equal(
    buildCanonicalSiOutputHeader(snapshot, "2026-10-07T12:00:00.000Z"),
    "SI CARGADO · v1.6.7 — Gobernanza Transaccional del Estado RDC · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: 2026-09-01 | 2026-09-01",
  );
});


test("formato canónico de Metodología conserva identidad y antigüedad relativa", () => {
  const snapshot = {
    version: "v0.11.8",
    versionName: "Versionado Canónico del Método General",
    canonicalUpdatedAt: "2026-10-07T21:10:00.000Z",
  };

  assert.equal(
    buildCanonicalMethodologyOutputHeader(snapshot, "2026-10-07T21:41:00.000Z"),
    "METODOLOGÍA CARGADA · v0.11.8 — Versionado Canónico del Método General · COMPLETA · ACTIVA · ÚLTIMO CAMBIO: hace 31 minutos | 2026-10-07",
  );
});
