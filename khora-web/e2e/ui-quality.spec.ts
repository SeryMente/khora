import { test, expect } from "@playwright/test";

const PRODUCT_ROUTES = [
  "/",
  "/sistema/custodia",
  "/sistema/ingreso",
  "/sistema/consulta",
  "/sistema/kpis",
  "/grafo",
  "/mapa",
  "/herramientas",
  "/herramientas/opi-vri",
  "/herramientas/bitacora",
  "/roadmap",
  "/adherence",
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

    test("la navegación mantiene ingreso como una sola superficie y conserva submenús externos", async ({ page }) => {
      await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

      await expect(page.locator("[data-navigation-entry]")).toHaveCount(6);
      const primaryIds = await page.locator("[data-navigation-entry]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-navigation-entry")));
      expect(primaryIds).toEqual(["ingreso", "custodia", "grafo", "consulta", "seguridad", "sistema"]);
      await expect(page.getByRole("link", { name: "Ingreso", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Custodia", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Capturar", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Dictado", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Edición", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Ingesta", exact: true })).toHaveCount(0);

      await page.goto("/sistema/ingreso", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("navigation", { name: "Modos de Ingreso" })).toHaveCount(0);

      await page.getByRole("button", { name: "Seguridad", exact: true }).click();
      const securityMenu = page.getByRole("navigation", { name: "Menú Seguridad" });
      await expect(securityMenu).toBeVisible();
      for (const name of ["Seguridad", "Entorno Persistente", "Bóveda", "Control MCP"]) {
        await expect(securityMenu.getByRole("link", { name, exact: true })).toBeVisible();
      }

      await page.getByRole("button", { name: "Seguridad", exact: true }).click();
      await expect(securityMenu).toHaveCount(0);

      await page.getByRole("button", { name: "Sistema", exact: true }).click();
      const systemMenu = page.getByRole("navigation", { name: "Menú Sistema" });
      await expect(systemMenu).toBeVisible();
      for (const name of ["Herramientas", "OPI / VRI", "KPIs", "Roadmap", "Adherencia", "Evidencia normativa", "Registro"]) {
        await expect(systemMenu.getByRole("link", { name, exact: true })).toBeVisible();
      }
      await expect(systemMenu.getByRole("link", { name: "Seguridad", exact: true })).toHaveCount(0);
      await expect(systemMenu.getByRole("link", { name: "Capturar", exact: true })).toHaveCount(0);
      await expect(systemMenu.getByRole("link", { name: "Dictado", exact: true })).toHaveCount(0);

      await page.getByRole("button", { name: "Sistema", exact: true }).click();
      await expect(systemMenu).toHaveCount(0);
    });

    test("los aliases históricos resuelven a superficies canónicas", async ({ page }) => {
      const aliases: Array<[string, RegExp]> = [
        ["/sistema/boveda", /\/sistema\/seguridad\?tab=boveda$/],
        ["/sistema/entorno-persistente", /\/sistema\/seguridad\?tab=entorno-persistente$/],
        ["/herramientas/bitacora", /\/sistema\/custodia$/],
        ["/capturar", /\/sistema\/ingreso$/],
        ["/sistema/dictado", /\/sistema\/ingreso$/],
        ["/sistema/editar", /\/sistema\/editar$/],
        ["/sistema/ingesta", /\/sistema\/custodia$/],
      ];

      for (const [alias, canonical] of aliases) {
        await page.goto(alias, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(canonical);
        await expect(page.locator("h1").first()).toBeVisible();
        if (alias === "/sistema/editar") {
          await expect(page.getByRole("heading", { name: /^Custodia$/ }).first()).toBeVisible();
        }
      }
    });

    test("ING-DIRECT-01 contract: editor alias retains direct route and only the opened approved tuple is sent", async ({ page }) => {
  const digest = "a".repeat(64);
  const sentTuples: { volcado_id: string; version: string; sha256: string }[] = [];
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: "operator@example.invalid" }, expires: new Date(Date.now()+3600000).toISOString() }) });
  });
  await page.route("**/api/volcados/pipeline", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      total: 1,
      counts: { archivado: 0, pendiente_revision: 0, en_revision: 0, listo_ingesta: 1, ingerido: 0, fallido: 0 },
      integrity: { sync: 1, text_without_audio: 0 },
      volcados: [{ id: "tuple-volcado-01", folio: 1, titulo: "Tuple test", estado: "listo_ingesta", version_aprobada: 2, sha256_aprobada: digest, version_actual: 2, session_id: "tuple-session", partes_count: 0 }]
    }) });
  });
  await page.route("**/api/versiones?id=tuple-volcado-01", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ versiones: [
      { version: 1, texto: "older version", sha256: "b".repeat(64) },
      { version: 2, texto: "approved version", sha256: digest }
    ]}) });
  });
  await page.route("**/api/audio/tuple-volcado-01/manifiesto", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ partes: [] }) });
  });
  await page.route("**/api/revision/tuple-volcado-01/compuerta", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ canApprove: false, version: 2, sha256: digest, blockers: [], warnings: [], counts: {} }) });
  });
  await page.route("**/api/revision/tuple-volcado-01/incidentes", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ incidentes: [] }) });
  });
  await page.route("**/api/revision/tuple-volcado-01/hallazgos?version=2", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hallazgos: [] }) });
  });
  await page.route("**/api/ingesta", async (route) => {
    const body = route.request().postData() || "";
    const pick = (name: string) => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r\\n]+)`))?.[1] || "";
    sentTuples.push({ volcado_id: pick("volcado_id"), version: pick("version"), sha256: pick("sha256") });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ io_id: "io-tuple-test", idempotent: sentTuples.length > 1 }),
    });
  });

  await page.goto("/sistema/editar?volcado_id=tuple-volcado-01&version=2");
  await expect(page).toHaveURL(/\/sistema\/editar\?volcado_id=tuple-volcado-01&version=2$/);
  await expect(page.getByRole("button", { name: "Ingerir esta version", exact: true })).toBeVisible();
  const exactTuple = { volcado_id: "tuple-volcado-01", version: "2", sha256: digest };
  await page.getByRole("button", { name: "Ingerir esta version", exact: true }).click();
  await expect.poll(() => sentTuples.length).toBe(1);
  expect(sentTuples[0]).toEqual(exactTuple);

  await page.goto("/sistema/editar?volcado_id=tuple-volcado-01&version=1");
  await expect(page).toHaveURL(/\/sistema\/editar\?volcado_id=tuple-volcado-01&version=1$/);
  await expect(page.getByRole("button", { name: "Ingerir esta version", exact: true })).toHaveCount(0);
  expect(sentTuples).toHaveLength(1);

  // Repetir la misma ratificada debe volver a enviar exactamente la misma terna.
  await page.goto("/sistema/editar?volcado_id=tuple-volcado-01&version=2");
  await expect(page).toHaveURL(/\/sistema\/editar\?volcado_id=tuple-volcado-01&version=2$/);
  await expect(page.getByRole("button", { name: "Ingerir esta version", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ingerir esta version", exact: true }).click();
  await expect.poll(() => sentTuples.length).toBe(2);
  expect(sentTuples).toEqual([exactTuple, exactTuple]);
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

      const firstTab = tabs.filter({ hasText: "Seguridad" }).first();
      await firstTab.focus();
      await page.keyboard.press("End");
      await expect(page.getByRole("tab", { name: "Control MCP", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Home");
      await expect(page.getByRole("tab", { name: "Seguridad", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("tab", { name: "Entorno Persistente", exact: true })).toHaveAttribute("aria-selected", "true");
    });

    test("el grafo mantiene interacción accesible por teclado", async ({ page }) => {
      // Current API contract returns two separately projected graphs, not the
      // legacy { nodes, edges } envelope formerly served by /api/grafo.
      await page.route("**/api/grafos**", async (route) => {
        const graph = {
          nodes: [
            {
              id: "node-ui-001",
              summary: "Nodo sintético accesible",
              community: 1,
              communityId: "fixture-community-01",
              communityRevision: "fixture-revision-01",
              level: 2,
              centrality: 3,
              origen: "fixture-ui",
              timestamp: "2026-10-06T00:00:00Z",
              verificacion: "VERIFIED",
            },
          ],
          edges: [],
          communities: 1,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            revision: "fixture-revision-01",
            empty: false,
            stale: false,
            source_count: 1,
            pending: 0,
            pending_sources: 0,
            pending_identity_pairs: 0,
            completed: 1,
            custody: { total: 1, eligible: 1, excluded: 0, policy: "synthetic-e2e" },
            automatic: graph,
            curated: graph,
            proposals: [],
            judgments: [],
            limitations: [],
            finished: true,
          }),
        });
      });

      await page.goto("/grafo", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

      const node = page.getByRole("button", { name: "Inspeccionar nodo: Nodo sintético accesible" });
      await expect(node).toBeVisible();
      await node.focus();
      await page.keyboard.press("Enter");

      await expect(page.getByRole("heading", { name: "Inspección de entidad", exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Cerrar inspección" }).click();
      await expect(page.getByRole("heading", { name: "Inspección de entidad", exact: true })).toHaveCount(0);
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
      expect(await page.locator("[data-ui-review-scenario] > header h2").count()).toBe(scenarios);
    }
  } finally {
    await context.close();
  }
});
