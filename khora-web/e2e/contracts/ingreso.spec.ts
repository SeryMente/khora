// @l0 L0-002-R · @req UI-04/INGRESO-INTEGRADO
import { test, expect } from '@playwright/test';

test.describe('Ingreso Integrado Screen and Layout', () => {
  test('renders correctly with editable textarea, standard tokens, and correct spacing', async ({ page }) => {
    // Navigate to the new integrated screen with test auth bypass
    await page.goto('/sistema/ingreso');

    // Verify Title element
    const mainHeader = page.locator('h1');
    await expect(mainHeader).toBeVisible();
    await expect(mainHeader).toContainText('Ingreso Integrado');

    // Verify main container has paddingBottom of 6rem (96px) to avoid SystemBar overlap
    const mainContainer = page.locator('main').first();
    await expect(mainContainer).toHaveCSS('padding-bottom', '96px');

    // Verify the editable textarea exists and is visible
    const editableArea = page.locator('textarea[placeholder="Escribe, pega o inicia el dictado para transcribir..."]').first();
    await expect(editableArea).toBeVisible();
    await expect(editableArea).toBeEditable();

    // Verify that the title input exists
    const titleInput = page.locator('input[placeholder="Título opcional (escribe o genera con IA)"]').first();
    await expect(titleInput).toBeVisible();

    // Verify "Título con IA" button exists
    const iaButton = page.locator('button:has-text("Título con IA")').first();
    await expect(iaButton).toBeVisible();

    // Verify "Iniciar dictado" button exists
    const dictadoButton = page.locator('button:has-text("Iniciar dictado")').first();
    await expect(dictadoButton).toBeVisible();

    // Verify "Archivar volcado" button exists
    const saveButton = page.locator('button:has-text("Archivar volcado")').first();
    await expect(saveButton).toBeVisible();
  });
});
