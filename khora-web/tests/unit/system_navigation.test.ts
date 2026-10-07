import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const systemBar = readFileSync(join(root, "app/components/os/SystemBar.tsx"), "utf8");
const securityPage = readFileSync(join(root, "app/sistema/seguridad/page.tsx"), "utf8");
const toolsPage = readFileSync(join(root, "app/herramientas/page.tsx"), "utf8");
const bitacoraRedirect = readFileSync(join(root, "app/herramientas/bitacora/page.tsx"), "utf8");

test("Sistema no pierde rutas de producto en su menú", () => {
  const requiredMenuRoutes = [
    "/sistema/dictado",
    "/sistema/editar",
    "/sistema/ingesta",
    "/sistema/kpis",
    "/mapa",
    "/capturar",
    "/herramientas",
    "/roadmap",
    "/adherence",
    "/sistema/seguridad",
    "/sistema/mcp",
    "/sistema/otros",
    "/sistema/registro",
  ];

  for (const route of requiredMenuRoutes) {
    assert.ok(
      systemBar.includes('href="' + route + '"'),
      "La ruta " + route + " debe permanecer accesible desde el menú Sistema.",
    );
  }
});

test("Seguridad conserva sus submódulos de control", () => {
  for (const tab of ["entorno-persistente", "boveda", "mcp"]) {
    assert.ok(
      securityPage.includes('"' + tab + '"'),
      "El submódulo de seguridad " + tab + " debe conservar su entrada UI.",
    );
  }

  assert.ok(
    securityPage.includes("PaginaMcpRevocacion"),
    "Control MCP debe seguir expuesto desde Seguridad reutilizando la consola existente.",
  );
});

test("Herramientas conserva UI funcional para sus submódulos", () => {
  assert.ok(toolsPage.includes('href="/herramientas/bitacora"'), "Bitácora debe conservar un acceso UI desde Herramientas.");
  assert.ok(toolsPage.includes('href="/herramientas/opi-vri"'), "OPI/VRI debe conservar un acceso UI desde Herramientas.");
  assert.ok(
    bitacoraRedirect.includes('redirect("/sistema/volcados")'),
    "El acceso histórico de Bitácora debe resolver a la superficie canónica de Volcados.",
  );
});
