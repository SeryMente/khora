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

test.describe('Regresión: Métrica de Racha (KPI-03)', () => {
  test('Muestra el widget de racha de días de captura', async ({ page }) => {
    // Intercept the API call to mock the response for the streak test
    await page.route('**/api/capturas', async route => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setUTCDate(today.getUTCDate() - 1);

      const json = {
        capturas: [
          { id: '1', texto: 'Test 1', timestamp: today.toISOString() },
          { id: '2', texto: 'Test 2', timestamp: yesterday.toISOString() }
        ]
      };
      await route.fulfill({ json, status: 200, contentType: 'application/json' });
    });

    await page.goto('/');

    // Bypass splash screen
    await page.addInitScript(() => {
      localStorage.setItem('khora_splash_seen', 'true');
    });

    // We can also click through if it shows
    try {
      await page.waitForTimeout(500);
      await page.click('body', { force: true });
    } catch (e) {}

    // Wait for the widget to appear
    await expect(page.locator('text=🔥 Racha:')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2 días')).toBeVisible();
  });
});
