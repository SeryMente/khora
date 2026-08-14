// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,PIPELINE/REQ-3,UI-ARCHIVO-MANUAL/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua —
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

    // Click on Archivo Manual to display legacy form
    await page.locator("button:has-text('Archivo Manual')").click();

    // Check textarea and placeholder
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder", "pega aqui el volcado, tan largo como quieras");

    // Check inventory table exists and shows mock volcado
    const row = page.locator("tbody tr");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Volcado de prueba");
  });

  test("should display 'Aprobar transcripción original' button and allow approval on confirmation", async ({ page }) => {
    // Override pipeline endpoint to return one manual archived volcado with total_versiones = 1
    await page.route("**/api/volcados/pipeline", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resumen: { total: 1, en_revision: 0, listo_ingesta: 0, ingerido: 0, anomalies: 0, sin_audio: 0 },
          items: [
            {
              id: "vol-manual-1",
              titulo: "Volcado Manual 1",
              recibido_en: "2026-07-28T12:00:00Z",
              estado: "archivado",
              io_id: null,
              ultimo_error: null,
              chars: 30,
              audio_url: null,
              audio_bytes: null,
              duracion_seg: null,
              version_aprobada: null,
              sha256_aprobado: null,
              aprobador: null,
              aprobado_en: null,
              total_versiones: 1,
              version_actual: 1,
              nodos_count: 0,
              aristas_count: 0,
              integrity: "sync",
              audioStatus: "none"
            }
          ]
        }),
      });
    });

    // Mock versions endpoint to return only v1 for this volcado
    await page.route(url => url.pathname.endsWith("/api/versiones"), async (route) => {
      console.log("MOCK VERSIONES CALLED:", route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          versiones: [
            {
              version: 1,
              texto: "Texto original del dictado",
              sha256: "sha256-original-v1",
              chars: 27,
              motivo: "transcripcion original del dictado",
              creado_en: "2026-07-28T12:00:00Z"
            }
          ]
        }),
      });
    });

    // Mock approval endpoint
    let approvePostCalled = false;
    await page.route("**/api/revision/vol-manual-1", async (route) => {
      if (route.request().method() === "POST") {
        approvePostCalled = true;
        const body = JSON.parse(route.request().postData() || "{}");
        expect(body.version).toBe(1);
        expect(body.sha256).toBe("sha256-original-v1");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, estado: "listo_ingesta" }),
        });
      } else {
        await route.fallback();
      }
    });

    // Load page and expect the item to load in the pipeline index
    await page.goto("/sistema/volcados");
    await page.waitForSelector("text=Volcado Manual 1");

    // Click to open in Drawer
    await page.click("text=Volcado Manual 1");

    // Go to "Revisión" subtab using the robust selector
    await page.locator("div.border-b button:has-text('Revisión')").click();

    // Expect to see the contextual button "Aprobar transcripción original"
    const approveBtn = page.locator("button:has-text('Aprobar transcripción original')");
    await expect(approveBtn).toBeVisible();

    // Setup dialog listener to automatically confirm the alert
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click the button
    await approveBtn.click();

    // Verify dialog message and that POST was triggered
    expect(dialogMessage).toBe("¿Aprobar la transcripción original como versión 1 lista para ingesta?");
    expect(approvePostCalled).toBe(true);
  });
});
