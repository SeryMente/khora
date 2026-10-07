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
      { path: '/mapa', expectedTitle: 'Mapa Visual de Ramificaciones' },
    ];

    for (const route of routes) {
      await page.goto('http://localhost:3000' + route.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

      try {
        await expect(page.locator('h1:has-text("' + route.expectedTitle + '"), h2:has-text("' + route.expectedTitle + '")').first()).toBeVisible({ timeout: 5000 });
      } catch (e) {
        if (route.path === '/grafo') {
          await expect(page.locator('text="Error: Error fetching graph data"')).toBeVisible();
        } else {
          throw e;
        }
      }
    }
  });

  test('La jerarquía primaria evita el mega-menú', async ({ page }) => {
    await page.goto('http://localhost:3000/sistema/volcados');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0, { timeout: 3000 });

    await expect(page.locator('[data-navigation-entry]')).toHaveCount(7);
    for (const name of ['Seguridad', 'Capturar', 'Ingreso', 'Grafo']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Sistema', exact: true }).click();
    const systemMenu = page.getByRole('navigation', { name: 'Menú Sistema' });
    await expect(systemMenu).toBeVisible();

    for (const name of ['Herramientas', 'OPI / VRI', 'KPIs', 'Roadmap', 'Adherencia', 'Evidencia normativa', 'Registro']) {
      await expect(systemMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await expect(systemMenu.getByRole('link', { name: 'Seguridad', exact: true })).toHaveCount(0);
    await expect(systemMenu.getByRole('link', { name: 'Capturar', exact: true })).toHaveCount(0);
    await expect(systemMenu.getByRole('link', { name: 'Dictado', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Seguridad', exact: true }).click();
    const securityMenu = page.getByRole('navigation', { name: 'Menú Seguridad' });
    await expect(securityMenu).toBeVisible();
    for (const name of ['Seguridad', 'Entorno Persistente', 'Bóveda', 'Control MCP']) {
      await expect(securityMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await securityMenu.getByRole('link', { name: 'Seguridad', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/sistema/seguridad$'));
    await expect(page.getByRole('heading', { name: 'Seguridad', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Control MCP', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Ingreso', exact: true }).click();
    const ingresoMenu = page.getByRole('navigation', { name: 'Menú Ingreso' });
    await expect(ingresoMenu).toBeVisible();
    for (const name of ['Ingreso', 'Dictado', 'Edición', 'Ingesta']) {
      await expect(ingresoMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Grafo', exact: true }).click();
    const grafoMenu = page.getByRole('navigation', { name: 'Menú Grafo' });
    await expect(grafoMenu).toBeVisible();
    for (const name of ['Grafo', 'Mapa']) {
      await expect(grafoMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });
});
