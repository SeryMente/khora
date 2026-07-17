import { test, expect } from '@playwright/test';

test.describe('Autenticación y PIN', () => {
  // We'll mock the API responses for the tests since they run without a DB
  test('Login correcto -> acceso concedido', async ({ page }) => {
    await page.route('/api/auth/login', async route => {
      await route.fulfill({
        json: { success: true },
        headers: {
          'Set-Cookie': 'khora_session=dummy-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });

    await page.goto('/login');
    await page.fill('input[type="password"]', '1234');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/^(?!.*\/login).*$/);
  });

  test('PIN incorrecto -> error claro, sin acceso', async ({ page }) => {
    await page.route('/api/auth/login', async route => {
      await route.fulfill({ status: 401, json: { error: 'Invalid PIN' } });
    });

    await page.goto('/login');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid PIN')).toBeVisible();
    expect(page.url()).toContain('/login');
  });

  test('Sesión expirada -> redirect automático a /login', async ({ page, context }) => {
    // We added dummy-token globally, so we need to clear it for this specific test
    await context.clearCookies();

    // If we go to /settings without a cookie, the middleware redirects to /login?expired=1
    await page.goto('/settings');
    await page.waitForURL('**/login?expired=1');

    // We expect the expired message to be visible
    await expect(page.locator('text=Sesión expirada')).toBeVisible();
  });
});
