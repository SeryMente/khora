// Recovery redesign on main (PR309): stable identifiers replace retired placeholders.
import { test, expect } from '@playwright/test';
import { prepareIngresoContract, expectPreparedIngreso } from '../helpers/ingreso-contract';

test('Ingreso exposes editable capture and gated secondary actions without dock overlap', async ({ page }) => {
    await prepareIngresoContract(page);
    await page.goto('/sistema/ingreso');
    await expectPreparedIngreso(page);
    await expect(page.getByRole('heading', { name: 'Ingreso', exact: true })).toBeVisible();
    const text = page.locator('[data-ui-id="ingreso.textarea"]');
    const title = page.locator('[data-ui-id="ingreso.titulo-input"]');
    await expect(text).toBeEditable();
    await expect(title).toBeEditable();
    await expect(page.locator('[data-ui-id="ingreso.btn-iniciar"]')).toBeVisible();
    const archive = page.locator('[data-ui-id="ingreso.btn-archivar"]');
    await expect(archive).toBeVisible();
    await expect(archive).toBeDisabled();
    await expect(page.locator('[data-ui-id="ingreso.btn-titulo-ia"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Más opciones de captura' }).click();
    const ia = page.locator('[data-ui-id="ingreso.btn-titulo-ia"]');
    await expect(ia).toBeVisible();
    await expect(ia).toBeDisabled();
    await text.fill('Contenido sintético para verificar la edición sin archivar.');
    await expect(archive).toBeDisabled(); // Editing must be confirmed first.
    await page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]').click();
    await expect(archive).toBeEnabled();
    await expect(ia).toBeEnabled();
    await archive.evaluate(el => el.scrollIntoView({ block: "center" }));
    await archive.click({ trial: true }); // A real pointer action must not be intercepted.
    const rect = await archive.boundingBox();
    const dock = await page.locator('nav[aria-label="Barra de sistema"]').boundingBox();
    expect(rect!.y + rect!.height).toBeLessThan(dock!.y);
});
