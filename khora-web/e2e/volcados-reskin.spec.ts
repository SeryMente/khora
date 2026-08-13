// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,PIPELINE/REQ-3 · @acr ACR-1.1,ACR-1.2 · @ua —
import { test, expect } from "@playwright/test";

test.describe("Volcados Reskin UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { email: "test@example.com", name: "Test User" },
          expires: new Date(Date.now() + 86400 * 1000).toISOString(),
        }),
      });
    });

    // Mock API requests to avoid relying on a real backend setup during simple UI checks
    await page.route("**/api/volcado", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "vol-123",
                texto: "Este es un texto de prueba para el volcado reskin",
                sha256: "abcdef1234567890abcdef1234567890",
                chars: 50,
                titulo: "Volcado de prueba",
                origen: "test",
                recibido_en: "2026-07-28T12:00:00Z",
                estado: "procesado",
                io_id: "io-999",
                intentos: 1,
                ultimo_error: null
              }
            ]
          }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock pipeline call to render gracefully
    await page.route("**/api/volcados/pipeline", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resumen: { total: 0 },
          items: []
        }),
      });
    });

    await page.goto("/sistema/volcados");
  });

  test("should render reskinned header and elements", async ({ page }) => {
    // Check main header
    const mainHeader = page.locator("h1");
    await expect(mainHeader).toContainText("Volcados");

    // Click on Archivar to display legacy form
    await page.locator("button:has-text('Archivar')").click();

    // Check textarea and placeholder
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder", "pega aqui el volcado, tan largo como quieras");

    // Check inventory table exists and shows mock volcado
    const row = page.locator("tbody tr");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Volcado de prueba");
  });
});
