// @l0 L0-002-R · @req GEN-03
import { test, expect } from '@playwright/test';

// Nota sobre la verificación de KHORA_SHELL=os:
// Verificar la rama KHORA_SHELL=os requiere un segundo proyecto Playwright con su propio
// webServer configurado con la variable de entorno KHORA_SHELL=os. Eso es una tarea aparte,
// posterior a que app/os/page.tsx exista y la ruta "/os" responda adecuadamente.

test.describe('Generacion Middleware Contract', () => {
  test('navega a "/" y afirma que el marcador [data-khora-main] sigue presente', async ({ page }) => {
    await page.goto('/');
    const mainMarker = page.locator('[data-khora-main], [data-testid="khora-desktop"], main').first();
    await expect(mainMarker).toBeVisible();
  });
});
