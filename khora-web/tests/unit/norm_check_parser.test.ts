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



// Exercise both real snapshot paths; replace only the external GitHub helper.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

test("methodology snapshots parse canonical Markdown and reject missing required fields", async (t) => {
  const file = path.resolve("lib/server/norm-check.ts");
  const requireActual = createRequire(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const commit = "a".repeat(40), date = "2026-10-10T12:00:00.000Z";
  const lines = ["- **Versi\u00f3n:** v0.14.14", "- **Nombre de versi\u00f3n:** Canon Transversal", "- **\u00daltima actualizaci\u00f3n can\u00f3nica:** 2026-10-10"].map(line => JSON.parse('"' + line + '"'));
  const scenarios = [
    { name: "valid", lines, error: null },
    { name: "missing version", lines: lines.slice(1), error: "METHODOLOGY_VERSION_MISSING" },
    { name: "invalid version", lines: [lines[0].replace("v0.14.14", "invalid"), ...lines.slice(1)], error: "METHODOLOGY_VERSION_MISSING" },
    { name: "missing name", lines: [lines[0], lines[2]], error: "METHODOLOGY_VERSION_NAME_MISSING" },
    { name: "missing date", lines: lines.slice(0, 2), error: "METHODOLOGY_LAST_UPDATED_MISSING" },
  ];
  for (const scenario of scenarios) for (const mode of ["current", "stored"] as const) {
    await t.test(mode + ": " + scenario.name, async () => {
      const blob = "b".repeat(40), content = Buffer.from(scenario.lines.join("\r\n")).toString("base64");
      const fetchGithub = async (input: string) => {
        const url = new URL(input);
        assert.equal(url.origin, "https://api.github.com");
        assert.ok(url.pathname.startsWith("/repos/SeryMente/metodologia/"));
        if (url.pathname.endsWith("/commits/main")) return Response.json({ sha: commit });
        if (url.pathname.endsWith("/commits")) return Response.json([{ sha: commit, commit: { committer: { date } } }]);
        if (url.pathname.includes("/contents/") || url.pathname.includes("/git/blobs/")) return Response.json({ sha: blob, encoding: "base64", content });
        throw Error("Unexpected test request: " + url.pathname);
      };
      const module = { exports: {} as any };
      const context = vm.createContext({ module, exports: module.exports, Buffer, require: (id: string) => id === "./normative-github" ? { fetchNormativeGithub: fetchGithub } : requireActual(id) });
      vm.runInContext(compiled, context, { filename: file });
      const operation = mode === "current" ? module.exports.getCurrentMethodologySnapshot() : module.exports.loadMethodologySnapshot(blob, commit);
      if (scenario.error) await assert.rejects(operation, { message: scenario.error });
      else {
        const result = await operation;
        assert.equal(result.version, "v0.14.14");
        assert.equal(result.versionName, "Canon Transversal");
        assert.equal(result.lastUpdatedAt, "2026-10-10");
        assert.equal(result.canonicalUpdatedAt, date);
        assert.equal(result.gitCommitSha, commit);
        assert.equal(result.gitBlobSha, blob);
      }
    });
  }
});
