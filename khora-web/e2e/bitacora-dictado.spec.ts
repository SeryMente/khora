import { test, expect } from '@playwright/test';

test.describe('Bitacora - Regresion Dictado', () => {
  test('debe mostrar el textarea principal y boton de dictado visible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    await page.goto('/sistema/ingreso');

    const textarea = page.locator('[data-ui-id="ingreso.textarea"]').first();
    await expect(textarea).toBeVisible();

    const dictarBtn = page.locator('[data-ui-id="ingreso.btn-iniciar"]');
    await expect(dictarBtn).toBeVisible();
    await expect(dictarBtn).toBeEnabled();
  });
});
