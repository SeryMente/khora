// Recovery redesign on main (PR309): contract migration, no product change.
import { test, expect } from '@playwright/test';
import { prepareIngresoContract, expectPreparedIngreso } from '../helpers/ingreso-contract';

test('Dictado retains canonical tokens, icons and safe layout after recovery redesign', async ({ page }) => {
    await prepareIngresoContract(page);
    await page.goto('/sistema/ingreso?modo=dictado');
    await expectPreparedIngreso(page);
    await expect(page.getByRole('heading', { name: 'Ingreso', exact: true })).toBeVisible();
    const main = page.locator('[data-ui-id="ingreso.container"]');
    await expect(main).toHaveCSS('max-width', '1000px');
    const mic = page.locator('[data-ui-id="ingreso.btn-iniciar"] svg');
    await expect(mic).toHaveAttribute('width', '19');
    await expect(mic).toHaveAttribute('height', '19');
    await expect(mic).toHaveAttribute('stroke-width', '2');
    const ink = await main.evaluate(el => getComputedStyle(el).getPropertyValue('--khora-ink').trim());
    for (const id of ['ingreso.titulo-input', 'ingreso.textarea']) {
        const field = page.locator('[data-ui-id="' + id + '"]');
        await expect(field).toBeEditable();
        await expect(field).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const canonical = await field.evaluate((el, ink) => {
            const probe = document.createElement('span'); probe.style.color = ink;
            el.appendChild(probe); const expected = getComputedStyle(probe).color; probe.remove();
            return { actual: getComputedStyle(el).color, expected };
        }, ink);
        expect(canonical.actual).toBe(canonical.expected);
        await expect(field).toHaveCSS('border-top-width', '0px');
    }
    const bottom = await page.locator('[data-ui-id="ingreso.btn-archivar"]').boundingBox();
    const dock = await page.locator('nav[aria-label="Barra de sistema"]').boundingBox();
    expect(bottom!.y + bottom!.height).toBeLessThan(dock!.y);
    const html = await main.innerHTML();
    expect(html).not.toContain('class="cora-');
    for (const legacy of ['#b00', '#a60', '#070']) expect(html).not.toContain(legacy);
});
