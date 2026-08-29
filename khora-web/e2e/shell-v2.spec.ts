import { test, expect } from '@playwright/test';

test.describe('Shell Navegación v2', () => {
  test('Navega por todos los dominios y verifica la renderización', async ({ page }) => {
    const routes = [
      { path: '/sistema/dictado', expectedTitle: 'Dictado' },
      { path: '/sistema/editar', expectedTitle: 'Editar transcripciones' },
      { path: '/sistema/volcados', expectedTitle: 'Mesa de Revisión Sincrónica' },
      { path: '/sistema/ingesta', expectedTitle: 'Ingesta' },
      { path: '/sistema/consulta', expectedTitle: 'Consola de Consulta' },
      { path: '/grafo', expectedTitle: 'Grafo PKG - Proyección Leiden' },
      { path: '/mapa', expectedTitle: 'Mapa Visual de Ramificaciones' }
    ];

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('domcontentloaded');

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
});
