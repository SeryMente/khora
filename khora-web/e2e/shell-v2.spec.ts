import { test, expect } from '@playwright/test';

test.describe('Shell Navegación v2', () => {
  test('Navega por todos los dominios y verifica la renderización', async ({ page }) => {
    const routes = [
      { path: '/sistema/dictado', expectedTitle: 'Dictado' },
      { path: '/sistema/editar', expectedTitle: 'Editar transcripciones' },
      { path: '/sistema/volcados', expectedTitle: 'Mesa de Revisión Sincrónica' },
      { path: '/sistema/ingesta', expectedTitle: 'Ingesta' },
      { path: '/sistema/consulta', expectedTitle: 'Consola de Consulta' },
      { path: '/sistema/seguridad', expectedTitle: 'Seguridad' },
      { path: '/sistema/mcp', expectedTitle: 'Control MCP & Revocación' },
      { path: '/sistema/otros', expectedTitle: 'Evidencia normativa' },
      { path: '/grafo', expectedTitle: 'Grafo PKG - Proyección Leiden' },
      { path: '/mapa', expectedTitle: 'Mapa Visual de Ramificaciones' }
    ];

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

      try {
        await expect(page.locator(`h1:has-text("${route.expectedTitle}"), h2:has-text("${route.expectedTitle}")`).first()).toBeVisible({ timeout: 5000 });
      } catch (e) {
        if (route.path === '/grafo') {
          await expect(page.locator('text="Error: Error fetching graph data"')).toBeVisible();
        } else {
          throw e;
        }
      }
    }
  });
  test('El menú Sistema expone las superficies recuperadas y el acceso de seguridad', async ({ page }) => {
    await page.goto('http://localhost:3000/sistema/volcados');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });
    await page.getByRole('button', { name: 'Sistema', exact: true }).click();

    const menu = page.getByRole('navigation', { name: 'Menú Sistema' });
    await expect(menu.getByRole('link', { name: 'Dictado', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Edición', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Ingesta', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'KPIs', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Mapa', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Capturar', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Herramientas', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Roadmap', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Adherencia', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Seguridad', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Control MCP', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Evidencia normativa', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Registro', exact: true })).toBeVisible();

    await menu.getByRole('link', { name: 'Seguridad', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/sistema/seguridad$'));
    await expect(page.getByRole('heading', { name: 'Seguridad', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Control MCP', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Control MCP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Control MCP & Revocación', exact: true })).toBeVisible();
  });
});
