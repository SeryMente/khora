import { test, expect } from '@playwright/test';
test('La entrada histórica llega a Ingreso y Escape termina la edición sin perder texto', async ({ page }) => {
  // Current checkpoint GET contract: a synthetic owner is required even with no recovery.
  await page.route("**/api/dictado/checkpoint**", async route => {
    await route.fulfill({ json: route.request().method() === "GET"
      ? { owner: "synthetic-custody-owner@example.invalid", recovery: null }
      : { ok: true } });
  });
  await page.goto('/sistema/dictado');
  await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/sistema\/ingreso$/);
  const input = page.locator('[data-ui-id="ingreso.textarea"]');
  await input.fill('Texto conservado al salir de edición');
  const banner = page.locator('[data-ui-id="ingreso.banner-edicion"]');
  await expect(banner).toBeVisible();
  await input.press('Escape');
  await expect(banner).toHaveCount(0);
  await expect(input).toHaveValue('Texto conservado al salir de edición');
});
