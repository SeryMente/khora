// @req LLAVERO/UI — narrow structural guard, not a security acceptance test.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NAVIGATION_REGISTRY } from "../../app/navigation/registry";
import { getAllScenariosForScreen, SCREENS } from "../../lib/ui-review/registry";
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
test("portable vault remains inside existing security menu", () => {
  const security = NAVIGATION_REGISTRY.find(n => n.id === "seguridad");
  const links = security?.children?.filter(n => n.id === "boveda-portable") ?? [];
  assert.equal(links.length, 1);
  assert.equal(links[0].href, "/sistema/seguridad?tab=boveda-portable");
  assert.ok(security?.children?.some(n => n.id === "boveda"));
  assert.ok(security?.coverage.includes("/sistema/seguridad/boveda-portable"));
  assert.ok(security?.coverage.includes("/sistema/seguridad/boveda-portable/abrir"));
});
test("production and both review renderers use the same shared view", () => {
  for (const p of ["app/sistema/seguridad/page.tsx", "app/ui-review/ReviewHarnessShell.tsx", "app/ui-review/[screen]/estatico/page.tsx"]) {
    const s = read(p); assert.ok(s.includes("<PortableVaultView"));
    assert.ok(s.includes("@/app/components/shared/PortableVaultView"));
  }
});
test("both closed states register exactly the identifiers present in the shared view", () => {
  assert.ok(SCREENS.includes("boveda-portable"));
  const source = read("app/components/shared/PortableVaultView.tsx");
  const ids = [...source.matchAll(/data-ui-id="([^"]+)"/g)].map(m => m[1]).sort();
  const scenarios = getAllScenariosForScreen("boveda-portable");
  assert.deepEqual(scenarios.map(s => s.scenario).sort(), ["pending", "unavailable"]);
  for (const scenario of scenarios) assert.deepEqual([...scenario.ui_ids].sort(), ids);
});
test("pending surface cannot handle secrets or perform fake protected operations", () => {
  const source = read("app/components/shared/PortableVaultView.tsx");
  assert.equal((source.match(/<button type="button" disabled/g) ?? []).length, 2);
  for (const token of ["fetch(", "localStorage", "sessionStorage", "navigator.clipboard", "<input", "otpauth:"]) assert.ok(!source.includes(token), token);
  assert.ok(source.includes("La protección nueva aún no está activa."));
  assert.ok(source.includes("Un código temporal no es la llave de cifrado"));
});
