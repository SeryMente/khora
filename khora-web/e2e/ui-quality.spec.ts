import { test, expect } from "@playwright/test";

const PRODUCT_ROUTES = [
  "/",
  "/sistema/volcados",
  "/sistema/ingreso",
  "/sistema/consulta",
  "/sistema/kpis",
  "/grafo",
  "/mapa",
  "/capturar",
  "/herramientas",
  "/herramientas/opi-vri",
  "/herramientas/bitacora",
  "/roadmap",
  "/adherence",
  "/sistema/dictado",
  "/sistema/editar",
  "/sistema/ingesta",
  "/sistema/seguridad",
  "/sistema/mcp",
  "/sistema/otros",
  "/sistema/registro",
  "/sistema/boveda",
  "/sistema/entorno-persistente",
];

const UI_REVIEW_SCREENS = [
  "ingreso",
  "archivo",
  "revision",
  "aprobacion",
  "ingesta",
  "registro",
  "grafo",
  "consulta",
  "kpi",
];

async function assertBasicAccessibility(page: import("@playwright/test").Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  const unnamedControls = await page.locator("button, a, input, select, textarea").evaluateAll((elements) =>
    elements
      .map((element) => {
        const el = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null };
        const ariaLabel = el.getAttribute("aria-label");
        const title = el.getAttribute("title");
        const placeholder = el.getAttribute("placeholder");
        const text = (el.textContent || "").trim();
        const labelsText = el.labels ? Array.from(el.labels).map((label) => label.textContent || "").join(" ").trim() : "";
        return {
          tag: el.tagName,
          name: ariaLabel || labelsText || title || text || placeholder || "",
          html: el.outerHTML.slice(0, 240),
        };
      })
      .filter((item) => !item.name)
  );

  expect(unnamedControls, "Todo control interactivo debe tener nombre accesible").toEqual([]);

  const nonNativeRoleButtons = await page.locator('[role="button"]').evaluateAll((elements) =>
    elements
      .filter((element) => !["BUTTON", "INPUT"].includes(element.tagName))
      .map((element) => element.outerHTML.slice(0, 240))
  );
  expect(nonNativeRoleButtons, "No se aceptan controles simulados como div[role=button]").toEqual([]);

  const invalidImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => !image.hasAttribute("alt") && image.getAttribute("role") !== "presentation")
      .map((image) => image.outerHTML.slice(0, 240))
  );
  expect(invalidImages, "Toda imagen debe declarar alt o role=presentation").toEqual([]);

  await expect(page.locator("h1").first(), "Cada superficie debe tener un h1").toBeVisible();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow, "No debe existir overflow horizontal relevante").toBeLessThanOrEqual(8);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe("UI Quality · " + viewport.name, () => {
    test.use({ viewport });

    test("todas las superficies de producto renderizan y mantienen accesibilidad básica", async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      for (const route of PRODUCT_ROUTES) {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status() ?? 0, "La ruta " + route + " no debe responder 4xx/5xx").toBeLessThan(400);
        await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
        await expect(page.locator("body")).toBeVisible();
        await assertBasicAccessibility(page);
      }

      expect(pageErrors, "No se permiten errores JavaScript no controlados").toEqual([]);
    });

    test("el menú Sistema es completamente navegable", async ({ page }) => {
      await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
      const toggle = page.getByRole("button", { name: "Sistema", exact: true });
      await expect(toggle).toBeVisible();
      await toggle.click();

      const menu = page.getByRole("menu", { name: "Menú Sistema" });
      await expect(menu).toBeVisible();

      const required = [
        "Dictado",
        "Edición",
        "Ingesta",
        "KPIs",
        "Mapa",
        "Capturar",
        "Herramientas",
        "Roadmap",
        "Adherencia",
        "Seguridad",
        "Control MCP",
        "Evidencia normativa",
        "Registro",
      ];

      for (const name of required) {
        await expect(menu.getByRole("menuitem", { name, exact: true })).toBeVisible();
      }

      await menu.getByRole("menuitem", { name: "Seguridad", exact: true }).click();
      await expect(page).toHaveURL(/\/sistema\/seguridad$/);
      await expect(page.getByRole("tab", { name: "Control MCP", exact: true })).toBeVisible();

      await page.getByRole("tab", { name: "Control MCP", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Control MCP & Revocación", exact: true })).toBeVisible();
    });

    test("los aliases históricos resuelven a superficies canónicas", async ({ page }) => {
      const aliases: Array<[string, RegExp]> = [
        ["/sistema/boveda", /\/sistema\/seguridad\?tab=boveda$/],
        ["/sistema/entorno-persistente", /\/sistema\/seguridad\?tab=entorno-persistente$/],
        ["/herramientas/bitacora", /\/sistema\/volcados$/],
      ];

      for (const [alias, canonical] of aliases) {
        await page.goto(alias, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(canonical);
        await expect(page.locator("h1").first()).toBeVisible();
      }
    });

    test("las pestañas de Seguridad exponen semántica ARIA coherente", async ({ page }) => {
      await page.goto("/sistema/seguridad", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
      const tabs = page.getByRole("tab");
      await expect(tabs).toHaveCount(4);
      expect(await tabs.evaluateAll((nodes) => nodes.filter((node) => node.getAttribute("tabindex") === "0").length)).toBe(1);
      for (const tab of await tabs.all()) {
        const controls = await tab.getAttribute("aria-controls");
        expect(controls).toBeTruthy();
        await expect(page.locator("#" + controls)).toHaveAttribute("aria-labelledby", await tab.getAttribute("id") || "");
      }
    });

    test("el tema cambia mediante control nativo y conserva accesibilidad", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
      const toggle = page.getByRole("button", { name: /Cambiar a tema/ });
      await expect(toggle).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await toggle.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeVisible();
    });
  });
}

test("UI Review · las 9 pantallas tienen prerender semántico", async ({ page }) => {
  for (const screen of UI_REVIEW_SCREENS) {
    const response = await page.goto("/ui-review/" + screen + "/estatico", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0, "El prerender " + screen + " no debe fallar").toBeLessThan(400);
    await expect(page.locator('[data-ui-review-static-screen="' + screen + '"]')).toBeVisible();
    const scenarios = await page.locator("[data-ui-review-scenario]").count();
    expect(scenarios, "Cada pantalla debe exponer escenarios sintéticos").toBeGreaterThan(0);
  }
});

test("UI Review · el prerender de las 9 pantallas funciona sin JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    const indexResponse = await page.goto("/ui-review/estatico", { waitUntil: "domcontentloaded" });
    expect(indexResponse?.status() ?? 0, "El índice estático no debe fallar").toBeLessThan(400);
    const indexLinks = await page.locator('a[href^="/ui-review/"][href$="/estatico"]').count();
    expect(indexLinks, "El índice debe enlazar todas las pantallas registradas").toBe(9);

    for (const screen of UI_REVIEW_SCREENS) {
      const response = await page.goto("/ui-review/" + screen + "/estatico", { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0, "El prerender " + screen + " no debe fallar").toBeLessThan(400);
      await expect(page.locator('[data-ui-review-static-screen="' + screen + '"]')).toBeVisible();
      const scenarios = await page.locator("[data-ui-review-scenario]").count();
      expect(scenarios, "Cada pantalla debe exponer escenarios sintéticos").toBeGreaterThan(0);
      expect(await page.locator("[data-ui-review-scenario] h2").count()).toBe(scenarios);
    }
  } finally {
    await context.close();
  }
});
