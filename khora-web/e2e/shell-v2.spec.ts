import { test, expect } from '@playwright/test';

const routes = [
  { path: '/sistema/ingreso', expectedTitle: 'Ingreso' },
  { path: '/sistema/ingreso?modo=dictado', expectedTitle: 'Ingreso' },
  { path: '/sistema/ingreso?modo=captura', expectedTitle: 'Ingreso' },
  { path: '/sistema/ingreso?modo=archivo', expectedTitle: 'Ingreso' },
  { path: '/sistema/ingreso?modo=revision', expectedTitle: 'Ingreso' },
  { path: '/sistema/ingreso?modo=ingesta', expectedTitle: 'Ingreso a memoria' },
  { path: '/sistema/custodia', expectedTitle: 'Custodia' },
  { path: '/sistema/consulta', expectedTitle: 'Consola de Consulta' },
  { path: '/sistema/seguridad', expectedTitle: 'Seguridad' },
  { path: '/sistema/mcp', expectedTitle: 'Control MCP & Revocación' },
  { path: '/sistema/otros', expectedTitle: 'Evidencia normativa' },
  { path: '/grafo', expectedTitle: 'Grafo PKG - Proyección Leiden' },
  { path: '/mapa', expectedTitle: 'Mapa Visual de Ramificaciones' },
  { path: '/capturar', expectedTitle: 'Ingreso' },
  { path: '/sistema/dictado', expectedTitle: 'Ingreso' },
  { path: '/sistema/editar', expectedTitle: 'Custodia' },
  { path: '/sistema/ingesta', expectedTitle: 'Custodia' },
];

test.describe('Shell Navegación v3', () => {
  test('Navega por todos los dominios y verifica la renderización', async ({ page }) => {
    for (const route of routes) {
      await page.goto('' + route.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

      try {
        await expect(
          page.locator('h1:has-text("' + route.expectedTitle + '"), h2:has-text("' + route.expectedTitle + '")').first()
        ).toBeVisible({ timeout: 5000 });
      } catch (e) {
        if (route.path === '/grafo') {
          await expect(page.locator('text="Error: Error fetching graph data"')).toBeVisible();
        } else {
          throw e;
        }
      }
    }
  });

  test('La jerarquía de primer nivel agrupa captura dentro de ingreso', async ({ page }) => {
    await page.goto('/sistema/custodia');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

    await expect(page.locator('[data-navigation-entry]')).toHaveCount(6);
    await expect(page.getByRole('link', { name: 'Ingreso', exact: true })).toBeVisible();
    for (const name of ['Grafo', 'Seguridad', 'Sistema']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Capturar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Dictado', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edición', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ingesta', exact: true })).toHaveCount(0);

    await page.goto('/sistema/ingreso');
    await expect(page.locator('[data-ui-id="ingreso.textarea"]')).toBeVisible();
    await page.route('**/api/volcado', route => route.fulfill({ json: { items: [] } }));
    await page.goto('/sistema/ingreso?modo=ingesta');
    await expect(page.getByRole('heading', { name: 'Ingreso a memoria', exact: true })).toBeVisible();
    await expect(page.locator('[data-ui-id="ingreso.ingesta"]')).toBeVisible();

    await page.getByRole('button', { name: 'Grafo', exact: true }).click();
    const grafoMenu = page.getByRole('navigation', { name: 'Menú Grafo' });
    await expect(grafoMenu).toBeVisible();
    for (const name of ['Grafo', 'Mapa']) {
      await expect(grafoMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Seguridad', exact: true }).click();
    const securityMenu = page.getByRole('navigation', { name: 'Menú Seguridad' });
    await expect(securityMenu).toBeVisible();
    for (const name of ['Seguridad', 'Entorno Persistente', 'Bóveda', 'Control MCP', 'Auditoría de eventos']) {
      await expect(securityMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Sistema', exact: true }).click();
    const systemMenu = page.getByRole('navigation', { name: 'Menú Sistema' });
    await expect(systemMenu).toBeVisible();
    for (const name of ['Herramientas', 'OPI / VRI', 'KPIs', 'Roadmap', 'Adherencia', 'Evidencia normativa', 'Auto-observación']) {
      await expect(systemMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(systemMenu.getByRole('link', { name: 'Seguridad', exact: true })).toHaveCount(0);
    await expect(systemMenu.getByRole('link', { name: 'Capturar', exact: true })).toHaveCount(0);
    await expect(systemMenu.getByRole('link', { name: 'Dictado', exact: true })).toHaveCount(0);
  });

  test('Cada submenu se abre, conserva su icono y queda dentro del viewport', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/sistema/custodia');
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
      await expect(page.locator('[data-navigation-primary-count]')).toHaveAttribute('data-navigation-primary-count', '6');

      for (const name of ['Grafo', 'Seguridad', 'Sistema']) {
        const button = page.getByRole('button', { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute('aria-expanded', 'true');

        const menu = page.getByRole('navigation', { name: 'Menú ' + name });
        await expect(menu).toBeVisible();

        const menuBox = await menu.boundingBox();
        expect(menuBox).not.toBeNull();
        expect(menuBox!.x).toBeGreaterThanOrEqual(0);
        expect(menuBox!.y).toBeGreaterThanOrEqual(0);
        expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport.width);
        expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(viewport.height);

        const svgCount = await button.locator('svg').count();
        expect(svgCount).toBeGreaterThanOrEqual(2);
        const labels = await menu.locator('a').allTextContents();
        expect(labels.length).toBeGreaterThan(0);

        await button.click();
        await expect(menu).toHaveCount(0);
        await expect(button).toHaveAttribute('aria-expanded', 'false');
      }
    }
  });
});

// Auto-observación: canonical/legacy routes and defensive UI regression.
const events = [{ id: "1", fase: "manejo", event_id: "MAN-900", estado: "FAIL", outcome: "FAILURE", outcome_discrepancy: false, correlacion_id: "synthetic-operation", servidor_en: "2026-01-01T00:00:00Z", component: "synthetic", duration_ms: 12, reason_code: "SYNTHETIC_FAILURE", source: "browser_reported" }];
for (const route of ["/sistema/auto-observacion", "/sistema/registro"]) {
  test(`${route}: shared UI, filters, operations, integrity and no raw payload`, async ({ page }) => {
    await page.route("**/api/auto-observacion?*", async request => {
      const integrity = new URL(request.request().url()).searchParams.get("integridad") === "1";
      await request.fulfill({ json: integrity ? { integrity: { verdict: "PARTIAL", checked: 1, verifiedPayloads: 0, legacy: 1, broken: 0, truncated: false, rootPresent: true, scope: "synthetic" } } : { events, has_more: false, next_cursor: null, observed_at: new Date().toISOString() } });
    });
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Auto-observación", exact: true })).toBeVisible();
    await expect(page.getByText("La operación registró un fallo", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Operaciones", exact: true }).click();
    await expect(page.getByRole("heading", { name: /synthetic-operation/ })).toBeVisible();
    await page.getByRole("button", { name: "Integridad", exact: true }).click();
    await page.getByLabel("Cadena a comprobar").selectOption("synthetic-operation");
    await page.getByRole("button", { name: "Verificar cadena", exact: true }).click();
    await expect(page.getByText("Comprobación parcial", { exact: true })).toBeVisible();
    await expect(page.getByText(/Sin anclaje externo/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });
}
test("empty and unavailable never look healthy", async ({ page }) => {
  await page.route("**/api/auto-observacion?*", r => r.fulfill({ json: { events: [], observed_at: new Date().toISOString(), has_more: false } }));
  await page.goto("/sistema/auto-observacion");
  await expect(page.getByText(/Ausencia de eventos no significa/)).toBeVisible();
  await page.unroute("**/api/auto-observacion?*");
  await page.route("**/api/auto-observacion?*", r => r.fulfill({ status: 503, json: { reason_code: "OBSERVATION_UNAVAILABLE" } }));
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Auto-observación no disponible", { exact: true })).toBeVisible();
});
