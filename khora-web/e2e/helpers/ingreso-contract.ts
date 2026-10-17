import { expect, type Page } from '@playwright/test';
/** Match the checkpoint dependency of the recovery redesign already on main.
 * Tests never require a production database or weaken custody-ready guards. */
export async function prepareIngresoContract(page: Page) {
    await page.addInitScript(() => localStorage.setItem('khora-theme', 'dark'));
    await page.route('**/api/dictado/checkpoint**', route => {
        const request = route.request();
        if (request.method() === 'POST') {
            const body = request.postDataJSON();
            return route.fulfill({ json: { ok: true, sessionId: body.sessionId, revisionId: body.revisionId } });
        }
        return route.fulfill({ json: { owner: 'contract@example.invalid', recovery: null, sealed: false, items: [], nextCursor: null } });
    });
    await page.route('**/api/dictado-experience', route => route.fulfill({ json: { records: [], summary: {}, profileKey: 'contract@example.invalid', truncated: false, retentionDays: 90 } }));
}
export async function expectPreparedIngreso(page: Page) {
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
    await expect(page.locator('[data-ui-id="ingreso.custodia-status"]')).toContainText('Salvaguarda preparada');
    await expect(page.locator('[data-ui-id="ingreso.btn-iniciar"]')).toBeEnabled();
}
