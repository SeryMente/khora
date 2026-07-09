import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Integración - Extensión Harmonia', () => {
  test('debe mostrar el botón de descarga y el ZIP debe existir (HTTP 200)', async ({ page, request }) => {
    // Navigate to the integration page
    await page.goto('/integracion');

    // Check for the extension card
    await expect(page.locator('h3', { hasText: 'Extensión Harmonia' })).toBeVisible();

    // Find the download button
    const downloadBtn = page.locator('a:has-text("Descargar extensión (.zip)")');
    await expect(downloadBtn).toBeVisible();

    // Get the href attribute (which contains the version)
    const href = await downloadBtn.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href).toContain('/downloads/harmonia-v');
    expect(href).toMatch(/\.zip$/);

    // Verify the file can be downloaded and returns 200 OK with correct content type
    const response = await request.get(href!);
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Allow various zip content types or binary fallback
    const contentType = response.headers()['content-type'];
    expect(['application/zip', 'application/x-zip-compressed', 'application/octet-stream']).toContain(contentType);
  });
});
