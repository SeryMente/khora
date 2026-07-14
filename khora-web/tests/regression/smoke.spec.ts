import { test, expect } from '@playwright/test';

test.describe('Regresión: Smoke tests de funciones entregadas', () => {
  test('PWA arranca y renderiza el shell (ATHANOR)', async ({ page }) => {
    await page.goto('/');
    // Check if splash screen is visible, it should complete after a moment or interaction
    const h1 = page.locator('h1:has-text("ATHANOR")');
    await expect(h1).toBeVisible({ timeout: 15000 });
  });

  test('Flujo de captura de bitácora acepta entrada', async ({ page }) => {
    await page.goto('/sistema');

    const captureButton = page.locator('button:has-text("Capturar")').first();
    await captureButton.waitFor({ state: 'visible' });
    await captureButton.click();

    const title = page.locator('h2:has-text("Capturar en Bitácora")');
    await expect(title).toBeVisible();

    const textarea = page.locator('textarea[placeholder="Escribe o dicta tu entrada aquí..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Probando la captura por regresión');
    await expect(textarea).toHaveValue('Probando la captura por regresión');
  });

  test('Punto de entrada de dictado por micrófono existe', async ({ page }) => {
    await page.goto('/sistema');

    const captureButton = page.locator('button:has-text("Capturar")').first();
    await captureButton.waitFor({ state: 'visible' });
    await captureButton.click();

    const micButton = page.locator('button[title="Iniciar dictado"], button[title="Dictado no soportado en este navegador"]').first();
    await expect(micButton).toBeVisible();
  });

  test('Endpoints existentes responden (status)', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});
