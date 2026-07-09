import { test, expect } from '@playwright/test';

test.describe('Shell Navegación v2', () => {
  test('Navega por todos los dominios y verifica la renderización', async ({ page }) => {
    const routes = [
      { path: '/bitacora', expectedTitle: 'Acceso Restringido' }, // Ya que bitacora requiere pin, primero veremos el candado
      { path: '/cabina', expectedTitle: 'Cabina' },
      { path: '/integracion', expectedTitle: 'Integración' },
      { path: '/nucleo', expectedTitle: 'Núcleo' },
      { path: '/prisma', expectedTitle: 'Prisma' },
      { path: '/sistemas', expectedTitle: 'Sistemas' },
      { path: '/preguntar', expectedTitle: 'Preguntar a la red' },
    ];

    for (const route of routes) {
      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('domcontentloaded');
      // Verificamos que contenga el título esperado.
      // Buscamos h1 o h2 para que no coincida con los textos ocultos de la navegación móvil que está debajo del pliegue.
      await expect(page.locator(`h1:has-text("${route.expectedTitle}"), h2:has-text("${route.expectedTitle}")`).first()).toBeVisible();
    }
  });

  test('El Modal "Capturar" se abre y cierra correctamente', async ({ page }) => {
    await page.goto('http://localhost:3000/sistemas');
    await page.waitForLoadState('domcontentloaded');

    const captureButton = page.locator('button:has-text("Capturar")').first();
    await captureButton.waitFor({ state: 'visible' });
    await captureButton.click();

    await expect(page.locator('h2:has-text("Capturar en Bitácora")')).toBeVisible();

    await page.locator('.fixed.inset-0 button').first().click();

    await expect(page.locator('h2:has-text("Capturar en Bitácora")')).toBeHidden();
  });
});
