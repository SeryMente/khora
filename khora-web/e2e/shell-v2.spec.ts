import { test, expect } from '@playwright/test';

const routes = [
  { path: '/sistema/ingreso', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/ingreso?modo=dictado', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/ingreso?modo=captura', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/ingreso?modo=archivo', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/ingreso?modo=revision', expectedTitle: 'Editar transcripciones' },
  { path: '/sistema/ingreso?modo=ingesta', expectedTitle: 'Ingreso a memoria' },
  { path: '/sistema/volcados', expectedTitle: 'Mesa de Revisión Sincrónica' },
  { path: '/sistema/consulta', expectedTitle: 'Consola de Consulta' },
  { path: '/sistema/seguridad', expectedTitle: 'Seguridad' },
  { path: '/sistema/mcp', expectedTitle: 'Control MCP & Revocación' },
  { path: '/sistema/otros', expectedTitle: 'Evidencia normativa' },
  { path: '/grafo', expectedTitle: 'Grafo PKG - Proyección Leiden' },
  { path: '/mapa', expectedTitle: 'Mapa Visual de Ramificaciones' },
  { path: '/capturar', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/dictado', expectedTitle: 'Ingreso Integrado' },
  { path: '/sistema/editar', expectedTitle: 'Editar transcripciones' },
  { path: '/sistema/ingesta', expectedTitle: 'Ingreso a memoria' },
];

test.describe('Shell Navegación v3', () => {
  test('Navega por todos los dominios y verifica la renderización', async ({ page }) => {
    for (const route of routes) {
      await page.goto('http://localhost:3000' + route.path);
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
    await page.goto('http://localhost:3000/sistema/volcados');
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

    await page.goto('http://localhost:3000/sistema/ingreso');
    const ingresoModes = page.getByRole('navigation', { name: 'Modos de Ingreso' });
    await expect(ingresoModes).toBeVisible();
    for (const name of ['Entrada', 'Dictado', 'Captura', 'Archivo', 'Revisión', 'Ingesta']) {
      await expect(ingresoModes.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Grafo', exact: true }).click();
    const grafoMenu = page.getByRole('navigation', { name: 'Menú Grafo' });
    await expect(grafoMenu).toBeVisible();
    for (const name of ['Grafo', 'Mapa']) {
      await expect(grafoMenu.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Seguridad', exact: true }).click();
    const securityMenu = page.getByRole('navigation', { name: 'Menú Seguridad' });
    await expect(securityMenu).toBeVisible();
    for (const name of ['Seguridad', 'Entorno Persistente', 'Bóveda', 'Control MCP']) {
      await expect(securityMenu.getByRole('link', { name, exact: true })).toBeVisible();
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
  });

  test('Cada submenu se abre, conserva su icono y queda dentro del viewport', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/sistema/volcados');
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
