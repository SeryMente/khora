import { test, expect } from '@playwright/test';

test.describe('Regresión: Smoke tests de funciones entregadas', () => {
  test('PWA arranca y renderiza el shell (Khora)', async ({ page }) => {
    await page.goto('/');
    // Check if splash screen is visible, it should complete after a moment or interaction
    const h1 = page.locator('h1:has-text("Khora")');
    await expect(h1).toBeVisible({ timeout: 15000 });
  });

  test('Flujo de captura acepta entrada', async ({ page }) => {
    await page.goto('/capturar');
    

    const title = page.locator('h2:has-text("Ingesta de Información")');
    await expect(title).toBeVisible();

    const textarea = page.locator('textarea[placeholder="Escribe o pega aquí la información..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Probando la captura por regresión');
    await expect(textarea).toHaveValue('Probando la captura por regresión');
  });

  test('Punto de entrada de dictado por micrófono existe', async ({ page }) => {
    await page.goto('/sistema/dictado');
    const micButton = page.locator('button:has-text("Iniciar dictado")').first();
    await expect(micButton).toBeVisible();
  });

  test('Endpoints existentes responden (status)', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});
