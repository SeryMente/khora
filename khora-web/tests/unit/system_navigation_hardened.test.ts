import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_PRIMARY_NAVIGATION_ITEMS, NAVIGATION_LEGACY_ALIASES, NAVIGATION_REGISTRY, normalizeNavigationPath } from "../../app/navigation/registry";

const root = process.cwd();
const bar = readFileSync(join(root, "app/components/os/SystemBar.tsx"), "utf8");

test("primary navigation stays bounded and registry-driven", () => {
  assert.equal(NAVIGATION_REGISTRY.length, 7);
  assert.ok(NAVIGATION_REGISTRY.length <= MAX_PRIMARY_NAVIGATION_ITEMS);
  assert.deepEqual(NAVIGATION_REGISTRY.map((entry) => entry.id), [
    "ingreso", "custodia", "grafo", "consulta", "chat", "seguridad", "sistema",
  ]);
});


test("Chat is an additional primary surface; Consulta remains intact", () => {
  const consulta = NAVIGATION_REGISTRY.find((item) => item.id === "consulta");
  const chat = NAVIGATION_REGISTRY.find((item) => item.id === "chat");
  assert.ok(consulta);
  assert.ok(chat);
  assert.equal(consulta.href, "/sistema/consulta");
  assert.deepEqual(consulta.coverage, ["/sistema/consulta"]);
  assert.equal(chat.href, "/chat");
  assert.deepEqual(chat.coverage, ["/chat", "/chat/frame"]);
  assert.equal(NAVIGATION_LEGACY_ALIASES.has("/sistema/consulta"), false);
  const consultaPage = readFileSync(join(root, "app/sistema/consulta/page.tsx"), "utf8");
  const consultaApi = readFileSync(join(root, "app/api/consulta/route.ts"), "utf8");
  assert.match(consultaPage, /ConsultaView/);
  assert.match(consultaApi, /\/api\/v1\/consulta/);
  assert.ok(readFileSync(join(root, "app/chat/page.tsx"), "utf8").includes('src="/chat/frame"'));
});

test("system menu only exposes secondary surfaces", () => {
  const entry = NAVIGATION_REGISTRY.find((item) => item.id === "sistema");
  assert.ok(entry);
  const ids = (entry.children ?? []).map((child) => child.id);
  assert.deepEqual(ids, ["herramientas", "opi-vri", "kpis", "roadmap", "adherence", "normative", "registro"]);
  assert.equal(entry.coverage.includes("/capturar"), false);
});

test("ingreso is the capture surface and volcados is the downstream archive/review domain", () => {
  const entry = NAVIGATION_REGISTRY.find((item) => item.id === "ingreso");
  assert.ok(entry);
  assert.equal(entry.kind, "direct");
  assert.equal(entry.href, "/sistema/ingreso");
  assert.deepEqual(entry.coverage, ["/sistema/ingreso"]);
  assert.equal((entry.children ?? []).length, 0);
  assert.equal(NAVIGATION_REGISTRY.some((item) => item.id === "capturar"), false);
  assert.equal(NAVIGATION_REGISTRY.some((item) => item.id === "dictado"), false);
  assert.equal(NAVIGATION_REGISTRY.some((item) => item.id === "edicion"), false);
  assert.equal(NAVIGATION_REGISTRY.some((item) => item.id === "ingesta"), false);
});

test("legacy ingreso routes resolve to canonical semantic domains without dead modes", () => {
  const aliases: Array<[string, string]> = [
    ["/capturar", "/sistema/ingreso"],
    ["/sistema/dictado", "/sistema/ingreso"],
    ["/sistema/editar", "/sistema/custodia"],
    ["/sistema/ingesta", "/sistema/custodia"],
  ];
  for (const [alias, canonical] of aliases) {
    assert.equal(NAVIGATION_LEGACY_ALIASES.get(alias), canonical);
    assert.equal(NAVIGATION_REGISTRY.some((entry) => entry.coverage.includes(alias)), false);
  }
  assert.ok(readFileSync(join(root, "app/capturar/page.tsx"), "utf8").includes('redirect("/sistema/ingreso")'));
  assert.ok(readFileSync(join(root, "app/sistema/dictado/page.tsx"), "utf8").includes('redirect("/sistema/ingreso")'));
  assert.ok(readFileSync(join(root, "app/sistema/editar/page.tsx"), "utf8").includes("CustodiaPage legacyEditorEntry"));
  assert.ok(readFileSync(join(root, "app/sistema/ingesta/page.tsx"), "utf8").includes('redirect("/sistema/custodia")'));
});

test("domain menus remain hierarchical while ingreso and volcados stay primary", () => {
  const ingreso = NAVIGATION_REGISTRY.find((item) => item.id === "ingreso");
  const grafo = NAVIGATION_REGISTRY.find((item) => item.id === "grafo");
  assert.ok(ingreso);
  assert.ok(grafo);
  assert.deepEqual((ingreso.children ?? []).map((child) => child.id), []);
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
  assert.match(bar, /khora-navigation-menu/);
  assert.match(bar, /ChevronUp/);
  assert.match(bar, /ChevronDown/);
});
