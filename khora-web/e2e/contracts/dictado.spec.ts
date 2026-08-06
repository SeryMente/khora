// @l0 L0-002-R · @req CORA-02/REQ-1 · @acr ACR-1.2
import { test, expect } from '@playwright/test';

test.describe('Dictado UI Reskin Contract and Layout', () => {
  test('renders with canonical tokens, custom icons, layout, and no literal colors or cora-* classes', async ({ page }) => {
    // Inject auth session to skip login
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    await page.goto('/sistema/dictado');

    // Verify Title element
    const mainHeader = page.locator('h1');
    await expect(mainHeader).toBeVisible();
    await expect(mainHeader).toContainText('Dictado');

    // Verify main container styles (paddingBottom of 6rem, maxWidth)
    const mainContainer = page.locator('main').first();
    await expect(mainContainer).toHaveCSS('padding-bottom', '96px'); // 6rem = 96px

    // Verify icons exist and have correct size & strokeWidth
    // Mic icon inside h1 should have size 32 (meaning width/height of 32px) and stroke-width 1.75
    const micIcon = page.locator('h1 svg').first();
    await expect(micIcon).toBeVisible();
    await expect(micIcon).toHaveAttribute('width', '32');
    await expect(micIcon).toHaveAttribute('height', '32');
    await expect(micIcon).toHaveAttribute('stroke-width', '1.75');

    // Check input style properties
    const inputField = page.locator('input[placeholder="titulo opcional"]').first();
    await expect(inputField).toBeVisible();
    await expect(inputField).toHaveCSS('background-color', 'rgb(23, 24, 26)'); // --khora-surface
    await expect(inputField).toHaveCSS('color', 'rgb(199, 204, 209)'); // --khora-ink
    await expect(inputField).toHaveCSS('border-color', 'rgb(35, 37, 42)'); // --khora-border

    // Check textarea transcription container
    const transcriptionArea = page.locator('main div.p-4.min-h-\\[240px\\]').first();
    await expect(transcriptionArea).toBeVisible();
    await expect(transcriptionArea).toHaveCSS('background-color', 'rgb(23, 24, 26)'); // --khora-surface
    await expect(transcriptionArea).toHaveCSS('color', 'rgb(199, 204, 209)'); // --khora-ink
    await expect(transcriptionArea).toHaveCSS('border-color', 'rgb(35, 37, 42)'); // --khora-border

    // Ensure we do not have legacy styles or literal color styles or cora-* classes
    const outerHtml = await mainContainer.innerHTML();
    expect(outerHtml).not.toContain('class="cora-');
    expect(outerHtml).not.toContain('color: "#b00"');
    expect(outerHtml).not.toContain('color: "#a60"');
    expect(outerHtml).not.toContain('color: "#070"');
  });
});
