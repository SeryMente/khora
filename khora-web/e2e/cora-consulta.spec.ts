// @l0 L0-002 · @req CORA-01/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import { test, expect } from '@playwright/test';

test.describe('CORA-01 - Consola de Consulta', () => {
  // Simulamos estar autenticados mockeando una sesión vacía que permita pasar middleware
  // O en este caso, interceptando también el endpoint de sesión si fuera necesario.
  // Pero lo más directo es interceptar la llamada al proxy /api/consulta para testear UI.

  test('debe mostrar respuesta con suficiencia confirmada, sin alertas y con evidencia', async ({ page }) => {
    // Interceptamos la llamada al proxy para evitar depender del backend real o keys
    await page.route('**/api/consulta', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('POST');

      const payload = JSON.parse(request.postData() || '{}');
      expect(payload.pregunta).toBe('¿Cuál es el capital de Francia?');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'La capital de Francia es París.',
          suficiencia: true,
          resumenes_incluidos: false,
          degradacion_declarada: null,
          no_anclada: false,
          evidencia: [
            {
              tripleta: 'Francia → tiene_capital → París',
              provenance: 'fuente:geografia.pdf',
              derived_from: 'RAZ-02/fVAL'
            }
          ]
        })
      });
    });

    // Como Playwright arranca la app local, vamos a la URL de consulta
    // Nota: en un entorno real con Next-Auth, tendríamos que bypasear el login,
    // pero para el test nos centramos en la UI asumiendo que ya estamos en la página.
    // Si la página requiere login, el test en CI de Khora asume que se usa una cookie o se mockea.
    // Aquí interceptamos /api/auth/session para simular login activo y bypaseamos el middleware de Next-Auth
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '9999-12-31T23:59:59.999Z'
        })
      });
    });

    // Simular que Next-Auth cree que está autenticado al cargar el middleware
    await page.context().addCookies([{
      name: 'authjs.session-token',
      value: 'mocked-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);

    await page.goto('/sistema/consulta');

    // Verificar que la UI cargó
    await expect(page.getByRole('heading', { name: 'Consola de Consulta' })).toBeVisible();

    // Escribir pregunta y consultar
    await page.getByPlaceholder('Escribe tu pregunta aquí...').fill('¿Cuál es el capital de Francia?');
    await page.getByRole('button', { name: 'Consultar' }).click();

    // Validar respuesta
    await expect(page.getByText('La capital de Francia es París.')).toBeVisible();

    // Validar badges (Suficiencia confirmada, sin NO-ANCLADA, sin degradación)
    await expect(page.getByText('Suficiencia Confirmada')).toBeVisible();
    await expect(page.getByText('NO-ANCLADA')).not.toBeVisible();
    await expect(page.getByText('Aviso de Degradación')).not.toBeVisible();

    // Validar panel de evidencia cerrado por defecto
    const evidenceButton = page.getByRole('button', { name: /Evidencia del Razonamiento/i });
    await expect(evidenceButton).toBeVisible();
    await expect(page.getByText('Francia → tiene_capital → París')).not.toBeVisible();

    // Abrir panel y validar contenido
    await evidenceButton.click();
    await expect(page.getByText('Francia → tiene_capital → París')).toBeVisible();
    await expect(page.getByText('fuente:geografia.pdf')).toBeVisible();
    await expect(page.getByText('RAZ-02/fVAL')).toBeVisible();
  });

  test('debe mostrar respuesta con suficiencia ámbar, NO-ANCLADA y degradación declarada', async ({ page }) => {
    await page.route('**/api/consulta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'No estoy seguro, pero creo que la respuesta es 42.',
          suficiencia: false,
          resumenes_incluidos: false,
          degradacion_declarada: 'Falta contexto en los documentos base.',
          no_anclada: true,
          evidencia: []
        })
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ user: { name: 'Test' } }) });
    });

    await page.context().addCookies([{
      name: 'authjs.session-token',
      value: 'mocked-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);

    await page.goto('/sistema/consulta');

    await page.getByPlaceholder('Escribe tu pregunta aquí...').fill('Pregunta dudosa');
    await page.getByRole('button', { name: 'Consultar' }).click();

    // Validar respuesta y badges
    await expect(page.getByText('No estoy seguro, pero creo que la respuesta es 42.')).toBeVisible();
    await expect(page.getByText('Suficiencia Parcial / Dudosa')).toBeVisible();
    await expect(page.getByText('NO-ANCLADA')).toBeVisible();

    // Validar degradación
    await expect(page.getByText('Aviso de Degradación')).toBeVisible();
    await expect(page.getByText('Falta contexto en los documentos base.')).toBeVisible();

    // Validar que no hay panel de evidencia
    await expect(page.getByRole('button', { name: /Evidencia del Razonamiento/i })).not.toBeVisible();
  });

  test('debe manejar y mostrar errores honestos sin inventar respuestas', async ({ page }) => {
    await page.route('**/api/consulta', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Error interno del servidor en conexión LLM' })
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ user: { name: 'Test' } }) });
    });

    await page.context().addCookies([{
      name: 'authjs.session-token',
      value: 'mocked-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);

    await page.goto('/sistema/consulta');

    await page.getByPlaceholder('Escribe tu pregunta aquí...').fill('Provocar error');
    await page.getByRole('button', { name: 'Consultar' }).click();

    // Validar que el error se muestra al usuario y no hay un payload falso inventado
    await expect(page.getByText('Error al consultar')).toBeVisible();
    await expect(page.getByText('Error interno del servidor en conexión LLM')).toBeVisible();
    await expect(page.getByText('Suficiencia')).not.toBeVisible();
  });
});
