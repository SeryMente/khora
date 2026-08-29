// @l0 L0-002-R · @req E2E-CICLO-INGESTA/REQ-1 · @acr ACR-1.2
import { test, expect } from "@playwright/test";

test.describe("Ciclo de Vida Completo: Iniciar revisión -> Aprobar -> Ingerir", () => {
  let estadoVolcado: "archivado" | "pendiente_revision" | "en_revision" | "listo_ingesta" | "ingerido" = "en_revision";
  let versionAprobada: number | null = null;
  let sha256Aprobado: string | null = null;
  let ioId: string | null = null;
  let lastIngestaFormData: { volcado_id: string; version: string; sha256: string } | null = null;

  test.beforeEach(async ({ page }) => {
    // Reset state before each run
    estadoVolcado = "en_revision";
    versionAprobada = null;
    sha256Aprobado = null;
    ioId = null;
    lastIngestaFormData = null;

    // 1. Mock session
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { email: "operador@khora.com", name: "Operador Khora" },
          expires: new Date(Date.now() + 86400 * 1000).toISOString(),
        }),
      });
    });

    // 2. Mock Pipeline endpoint returning current state
    await page.route("**/api/volcados/pipeline", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 1,
          counts: {
            archivado: estadoVolcado === "archivado" ? 1 : 0,
            pendiente_revision: estadoVolcado === "pendiente_revision" ? 1 : 0,
            en_revision: estadoVolcado === "en_revision" ? 1 : 0,
            listo_ingesta: estadoVolcado === "listo_ingesta" ? 1 : 0,
            ingerido: estadoVolcado === "ingerido" ? 1 : 0,
            fallido: 0,
          },
          integrity: {
            sync: 1,
            text_edited: 0,
            text_without_audio: 0,
            audio_without_text: 0,
            audio_partial: 0,
            broken_provenance: 0,
          },
          volcados: [
            {
              id: "v-ciclo-001",
              folio: 101,
              session_id: "sesion-ciclo-001",
              session_estado: "completo",
              titulo: "Volcado de Prueba Ciclo Ingesta",
              recibido_en: new Date().toISOString(),
              estado: estadoVolcado,
              io_id: ioId,
              ultimo_error: null,
              chars: 38,
              audio_url: "http://storage.com/audio-ciclo.webm",
              audio_bytes: 120000,
              duracion_seg: 15,
              version_aprobada: versionAprobada,
              sha256_aprobado: sha256Aprobado,
              aprobador: versionAprobada ? "operador@khora.com" : null,
              aprobado_en: versionAprobada ? new Date().toISOString() : null,
              total_versiones: 1,
              version_actual: 1,
              nodos_count: estadoVolcado === "ingerido" ? 8 : 0,
              aristas_count: estadoVolcado === "ingerido" ? 6 : 0,
              integrity: "sync",
              audioStatus: "disponible",
              audio_status: "disponible",
              partes_count: 1,
              blob_paths: ["blobs/audio-ciclo.webm"],
            },
          ],
        }),
      });
    });

    // 3. Mock Versiones
    await page.route("**/api/versiones**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          versiones: [
            {
              version: 1,
              texto: "Texto original del volcado de prueba",
              sha256: "sha256-v1-ciclo-test",
              chars: 38,
            },
          ],
        }),
      });
    });

    // 4. Mock Revision Compuerta
    await page.route("**/api/revision/v-ciclo-001/compuerta**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          canApprove: true,
          version: 1,
          sha256: "sha256-v1-ciclo-test",
          gate_hash: "gh123",
          blockers: [],
          warnings: [],
          counts: {
            errores_tipograficos_pendientes: 0,
            correcciones_lingüisticas_pendientes: 0,
            observaciones_sintacticas_pendientes: 0,
            incidentes_operativos_abiertos: 0,
          },
        }),
      });
    });

    // Mock Incidentes & Hallazgos
    await page.route("**/api/revision/v-ciclo-001/incidentes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ incidentes: [] }),
      });
    });

    await page.route("**/api/revision/v-ciclo-001/hallazgos**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hallazgos: [] }),
      });
    });

    // 5. Mock Aprobar Version endpoint
    await page.route("**/api/revision/v-ciclo-001/aprobar", async (route) => {
      estadoVolcado = "listo_ingesta";
      versionAprobada = 1;
      sha256Aprobado = "sha256-v1-ciclo-test";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          version_aprobada: 1,
          sha256_aprobado: "sha256-v1-ciclo-test",
        }),
      });
    });

    // 6. Mock Kernel Ingestion endpoint
    await page.route("**/api/ingesta", async (route) => {
      const request = route.request();
      const postData = await request.postData();

      // Extract form data fields
      if (postData) {
        const volcadoIdMatch = postData.match(/name="volcado_id"\r\n\r\n([^\r\n]+)/);
        const versionMatch = postData.match(/name="version"\r\n\r\n([^\r\n]+)/);
        const sha256Match = postData.match(/name="sha256"\r\n\r\n([^\r\n]+)/);

        if (volcadoIdMatch && versionMatch && sha256Match) {
          lastIngestaFormData = {
            volcado_id: volcadoIdMatch[1],
            version: versionMatch[1],
            sha256: sha256Match[1],
          };
        }
      }

      estadoVolcado = "ingerido";
      ioId = "io-ciclo-e2e-8899";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          io_id: "io-ciclo-e2e-8899",
        }),
      });
    });

    await page.goto("/sistema/volcados");
  });

  test("ejecuta el ciclo de vida completo: archivado -> iniciar revisión -> aprobar -> ingerir", async ({ page }) => {
    // 1. Seleccionar el volcado
    await page.locator("text=Volcado de Prueba Ciclo Ingesta").first().click();

    // Confirmar que muestra la Mesa de Revisión
    await expect(page.locator("h1:has-text('Mesa de Revisión Sincrónica')")).toBeVisible();

    // 2. Aprobar versión (v1)
    const tecladoBtn = page.locator("button:has-text('Alternativa Teclado')");
    await expect(tecladoBtn).toBeVisible();
    await tecladoBtn.click();

    const inputConfirm = page.locator("input[placeholder='APROBAR v1']");
    await inputConfirm.fill("APROBAR v1");
    await page.locator("button:has-text('Confirmar Aprobación')").click();

    // 3. Disparar Ingesta
    const ingerirBtn = page.locator("button:has-text('Ingerir versión aprobada')").first();
    await expect(ingerirBtn).toBeVisible();
    await ingerirBtn.click();

    // 4. Verificar que la respuesta/interfaz refleja io_id
    await expect(page.locator("text=io_id: io-ciclo-e2e-8899").first()).toBeVisible();

    // 5. Verificar que la petición enviada a /api/ingesta incluyó los parámetros de procedencia requeridos
    expect(lastIngestaFormData).not.toBeNull();
    expect(lastIngestaFormData?.volcado_id).toBe("v-ciclo-001");
    expect(lastIngestaFormData?.version).toBe("1");
    expect(lastIngestaFormData?.sha256).toBe("sha256-v1-ciclo-test");
  });
});
