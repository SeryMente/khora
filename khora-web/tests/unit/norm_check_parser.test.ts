import test from "node:test";
import assert from "node:assert/strict";
import { parsePrinciples } from "@/lib/server/norm-check";

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

  assert.deepEqual(manifest.map((item) => item.folio), ["P019", "P020"]);
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
