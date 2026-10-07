import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_PRIMARY_NAVIGATION_ITEMS, NAVIGATION_REGISTRY, normalizeNavigationPath } from "../../app/navigation/registry";

const root = process.cwd();
const bar = readFileSync(join(root, "app/components/os/SystemBar.tsx"), "utf8");

test("primary navigation stays bounded and registry-driven", () => {
  assert.equal(NAVIGATION_REGISTRY.length, 7);
  assert.ok(NAVIGATION_REGISTRY.length <= MAX_PRIMARY_NAVIGATION_ITEMS);
  assert.deepEqual(NAVIGATION_REGISTRY.map((entry) => entry.id), [
    "volcados", "ingreso", "grafo", "consulta", "capturar", "seguridad", "sistema",
  ]);
});

test("system menu only exposes secondary surfaces", () => {
  const entry = NAVIGATION_REGISTRY.find((item) => item.id === "sistema");
  assert.ok(entry);
  const ids = (entry.children ?? []).map((child) => child.id);
  assert.deepEqual(ids, ["herramientas", "opi-vri", "kpis", "roadmap", "adherence", "normative", "registro"]);
  assert.equal(entry.coverage.includes("/capturar"), false);
});

test("domain menus are hierarchical rather than flattened into one list", () => {
  const ingreso = NAVIGATION_REGISTRY.find((item) => item.id === "ingreso");
  const grafo = NAVIGATION_REGISTRY.find((item) => item.id === "grafo");
  assert.ok(ingreso);
  assert.ok(grafo);
  assert.deepEqual((ingreso.children ?? []).map((child) => child.id), ["ingreso-main", "dictado", "edicion", "ingesta"]);
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

test("shell renders the registry rather than a second hand-built inventory", () => {
  assert.match(bar, /NAVIGATION_REGISTRY/);
  assert.match(bar, /data-navigation-entry=\{entry\.id\}/);
  assert.match(bar, /data-navigation-menu=\{entry\.id\}/);
});