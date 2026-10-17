import { test, expect } from '@playwright/test';
import { prepareIngresoContract, expectPreparedIngreso } from './helpers/ingreso-contract';

test.describe('Bitacora - Regresion Dictado', () => {
  test('debe mostrar el textarea principal y boton de dictado visible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    await prepareIngresoContract(page);
    await page.goto('/sistema/ingreso?modo=dictado');
    await expectPreparedIngreso(page);

    const textarea = page.locator('[data-ui-id="ingreso.textarea"]').first();
    await expect(textarea).toBeVisible();

    const dictarBtn = page.locator('[data-ui-id="ingreso.btn-iniciar"]');
    await expect(dictarBtn).toBeVisible();
    await expect(dictarBtn).toBeEnabled();
  });
});
