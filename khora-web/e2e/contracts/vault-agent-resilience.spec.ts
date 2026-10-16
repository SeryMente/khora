import { test, expect } from '@playwright/test';
const empty = { total: 0, active: 0, expired: 0, revoked: 0, entries: [] };
for (const sample of [
  { name: '401', status: 401, body: { error: 'not_authorized' }, error: true },
  { name: '503', status: 503, body: { error: 'history_unavailable' }, error: true },
  { name: 'malformed success', status: 200, body: { ...empty, entries: [null] }, error: true },
  { name: 'valid history', status: 200, body: empty, error: false },
]) test('Bóveda conserva la pantalla ante ' + sample.name, async ({ page }) => {
  const mutations: string[] = [];
  await page.route('**/api/boveda', route => route.fulfill({ json: { configurado: false, abierta: false, minutos: 30 } }));
  await page.route('**/api/security/vault-agent/token', route => {
    if (route.request().method() !== 'GET') mutations.push(route.request().method());
    return route.fulfill({ json: { active: false } });
  });
  await page.route('**/api/security/vault-agent/history?*', route => route.fulfill({ status: sample.status, json: sample.body }));
  await page.goto('/sistema/boveda');
  await expect(page.locator('[data-ui-id="seguridad.boveda.agente"]')).toBeVisible();
  await expect(page.getByText('No se pudo consultar el estado del acceso temporal.', { exact: true })).toHaveCount(sample.error ? 1 : 0);
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByText('Application error:', { exact: false })).toHaveCount(0);
  expect(mutations).toEqual([]);
});
