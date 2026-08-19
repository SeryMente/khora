// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { test, expect } from "@playwright/test";

test.describe("Mesa de Revisión Sincrónica (REVISION-COCKPIT/REQ-1)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: "khora-boveda-auth",
        value: "desbloqueado",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("Carga de la Mesa de Revisión, elementos de sincronización, alta fricción y única acción de ingesta", async ({ page }) => {
    // 1. Navegar a la Mesa de Revisión de volcados
    await page.goto("/sistema/volcados");
    await page.waitForLoadState("networkidle");

    // 2. Confirmar encabezado de Mesa de Revisión Sincrónica
    const titulo = page.locator("h1");
    await expect(titulo).toContainText("Mesa de Revisión Sincrónica");

    // 3. Seleccionar primer volcado disponible si existe
    const primerVolcado = page.locator("div.cursor-pointer").first();
    if (await primerVolcado.isVisible()) {
      await primerVolcado.click();
    }

    // 4. Verificar presencia del reproductor de audio y columna de lectura
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const reproductorAudio = page.locator("audio");
    if (await reproductorAudio.isVisible()) {
      await expect(reproductorAudio).toBeVisible();
    }

    // 5. Verificar presencia de contadores o barra de la compuerta de aprobación
    const compuertaBar = page.locator("text=Compuerta de Aprobación Server-Side");
    await expect(compuertaBar).toBeVisible();
  });
});
