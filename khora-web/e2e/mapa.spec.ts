// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import { test, expect } from '@playwright/test';

test.describe('Mapa Visual de Ramificaciones', () => {
  test('debe renderizar el mapa correctamente con sus nodos base', async ({ page }) => {
    // Requiere storageState inyectado para Auth.js real OIDC.
    test.skip(true, 'Requiere storageState de sesión OIDC real (Google) provisto por el operador; no automatizable en este entorno — ver tarea de seguimiento');

    await page.goto('/mapa');

    // Verificar título y estructura
    await expect(page.getByRole('heading', { name: 'Mapa Visual de Ramificaciones' })).toBeVisible();
    await expect(page.locator('[data-testid="react-flow-container"]')).toBeVisible();

    // Verificar que los nodos autorizados están presentes usando sus preguntas o condiciones
    // B-P10
    await expect(page.getByText('Usuario nuevo')).toBeVisible();
    await expect(page.getByText('¿Desea iniciar el tour interactivo?')).toBeVisible();

    // A-P01
    await expect(page.getByText('¿Qué herramienta principal desea explorar primero?')).toBeVisible();

    // S-P03
    await expect(page.getByText('¿Conectar con Notion?')).toBeVisible();
  });

  test('JAMAS debe renderizar nodos no autorizados (authorized: false)', async ({ page }) => {
    test.skip(true, 'Requiere storageState de sesión OIDC real (Google) provisto por el operador; no automatizable en este entorno — ver tarea de seguimiento');
    await page.goto('/mapa');

    // Verificar que un nodo no autorizado se filtre completamente.
    // En map-data.json, el nodo C-P05 es 'authorized: false' y contiene 'Módulo experimental'

    // Check elements that MUST NOT exist
    const nonAuthCondition = page.getByText('Módulo experimental');
    const nonAuthQuestion = page.getByText('¿Activar integraciones avanzadas (BETA)?');

    await expect(nonAuthCondition).toHaveCount(0);
    await expect(nonAuthQuestion).toHaveCount(0);
  });
});
