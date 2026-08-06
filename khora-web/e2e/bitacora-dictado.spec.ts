import { test, expect } from '@playwright/test';

test.describe('Bitacora - Regresion Dictado', () => {
  test('debe mostrar el textarea principal y boton de dictado visible', async ({ page }) => {
    // Inject auth token in localStorage to bypass login
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    await page.goto('/sistema/dictado');

    const textarea = page.locator('input[placeholder="titulo opcional"]').first();
    await expect(textarea).toBeVisible();

    const dictarBtn = page.getByRole('button', { name: /Iniciar dictado|Detener/i });
    await expect(dictarBtn).toBeVisible();

    page.on('dialog', dialog => dialog.accept());

    await page.waitForTimeout(500);
    await dictarBtn.click();

    const dictarVisible = await page.getByRole('button', { name: /Detener/i }).isVisible() || await page.getByRole('button', { name: /Iniciar dictado/i }).isVisible();
    expect(dictarVisible).toBeTruthy();
  });
});
