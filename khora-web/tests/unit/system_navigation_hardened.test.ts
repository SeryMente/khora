import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_PRIMARY_NAVIGATION_ITEMS, NAVIGATION_REGISTRY, normalizeNavigationPath } from "../../app/navigation/registry";

const root = process.cwd();
const bar = readFileSync(join(root, "app/components/os/SystemBar.tsx"), "utf8");

test("primary navigation stays bounded and registry-driven", () => {
  assert.equal(NAVIGATION_REGISTRY.length, 6);
  assert.ok(NAVIGATION_REGISTRY.length <= MAX_PRIMARY_NAVIGATION_ITEMS);
  assert.deepEqual(NAVIGATION_REGISTRY.map((entry) => entry.id), [
    "volcados", "ingreso", "grafo", "consulta", "seguridad", "sistema",
  ]);
});

test("system menu only exposes secondary surfaces", () => {
  const entry = NAVIGATION_REGISTRY.find((item) => item.id === "sistema");
  assert.ok(entry);
  const ids = (entry.children ?? []).map((child) => child.id);
  assert.deepEqual(ids, ["herramientas", "opi-vri", "kpis", "roadmap", "adherence", "normative", "registro"]);
  assert.equal(entry.coverage.includes("/capturar"), false);
});

test("input and capture form one coherent ingreso domain", () => {
  const entry = NAVIGATION_REGISTRY.find((item) => item.id === "ingreso");
  assert.ok(entry);
  assert.equal(entry.coverage.includes("/capturar"), true);
  assert.deepEqual((entry.children ?? []).map((child) => child.id), [
    "ingreso-main", "capturar", "dictado", "edicion", "ingesta",
  ]);
  assert.equal(NAVIGATION_REGISTRY.some((item) => item.id === "capturar"), false);
});

test("domain menus are hierarchical rather than flattened into one list", () => {
  const ingreso = NAVIGATION_REGISTRY.find((item) => item.id === "ingreso");
  const grafo = NAVIGATION_REGISTRY.find((item) => item.id === "grafo");
  assert.ok(ingreso);
  assert.ok(grafo);
  assert.deepEqual((ingreso.children ?? []).map((child) => child.id), ["ingreso-main", "capturar", "dictado", "edicion", "ingesta"]);
  assert.deepEqual((grafo.children ?? []).map((child) => child.id), ["grafo-main", "mapa"]);
});

test("canonical coverage is unique", () => {
  const seen = new Set<string>();
  for (const entry of NAVIGATION_REGISTRY) {
    for (const route of entry.coverage) {
      const normalized = normalizeNavigationPath(route);
      assert.equal(seen.has(normalized), false, "duplicate coverage: " + normalized);
      seen.add(normalized);
    }
  }
});

test("shell renders the registry and keeps menu panels un-clipped", () => {
  assert.match(bar, /NAVIGATION_REGISTRY/);
  assert.match(bar, /data-navigation-entry=\{entry\.id\}/);
  assert.match(bar, /data-navigation-menu=\{entry\.id\}/);
  assert.doesNotMatch(bar, /overflow-x-auto/);
  assert.match(bar, /max-\[639px\]:fixed/);
  assert.match(bar, /ChevronUp/);
  assert.match(bar, /ChevronDown/);
});
