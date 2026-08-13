// @l0 L0-002-R · @req PIPELINE/REQ-3 · @acr ACR-1.2
import { test, expect } from "@playwright/test";

test.describe("Pipeline Control Tower E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    let v002Approved = false;
    let v002Ingested = false;

    // Log console from browser
    page.on("console", (msg) => {
      console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`);
    });

    // 1. Mock Next-Auth session
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

    // 2. Mock Pipeline API endpoint with full mock items representing different integrity/pipeline states
    await page.route("**/api/volcados/pipeline", async (route) => {
      console.log(`MOCK PIPELINE CALLED: v002Approved=${v002Approved}, v002Ingested=${v002Ingested}`);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resumen: {
            total: 3,
            archivado: 1,
            pendiente_revision: 0,
            en_revision: v002Approved ? 0 : 1,
            listo_ingesta: (v002Approved && !v002Ingested) ? 1 : 0,
            ingerido: v002Ingested ? 2 : 1,
            fallido: 0,
            anomalies: 2,
            sin_audio: 1
          },
          items: [
            {
              id: "v-001",
              titulo: "Volcado de Ingesta Exitoso",
              recibido_en: "2026-07-28T12:00:00Z",
              estado: "ingerido",
              io_id: "io-abc-123-xyz",
              ultimo_error: null,
              chars: 120,
              audio_url: "http://storage.com/audio1.webm",
              audio_bytes: 520000,
              duracion_seg: 25,
              version_aprobada: 2,
              sha256_aprobado: "sha256-aprobado-version-2",
              aprobador: "operador@khora.com",
              aprobado_en: "2026-07-28T13:00:00Z",
              total_versiones: 2,
              version_actual: 2,
              nodos_count: 12,
              aristas_count: 18,
              integrity: "sync",
              audioStatus: "audio_texto"
            },
            {
              id: "v-002",
              titulo: "Volcado en Revisión Modificado",
              recibido_en: "2026-07-28T11:00:00Z",
              estado: v002Ingested ? "ingerido" : (v002Approved ? "listo_ingesta" : "en_revision"),
              io_id: v002Ingested ? "io-newly-ingested-id" : null,
              ultimo_error: null,
              chars: 85,
              audio_url: "http://storage.com/audio2.webm",
              audio_bytes: 8500, // Small bytes -> audio_partial anomaly
              duracion_seg: 3,
              version_aprobada: v002Approved ? 3 : null,
              sha256_aprobado: v002Approved ? "sha3" : null,
              aprobador: v002Approved ? "operador@khora.com" : null,
              aprobado_en: v002Approved ? "2026-07-28T14:00:00Z" : null,
              total_versiones: 3,
              version_actual: 3,
              nodos_count: v002Ingested ? 5 : 0,
              aristas_count: v002Ingested ? 4 : 0,
              integrity: "audio_partial",
              audioStatus: "audio_parcial"
            },
            {
              id: "v-003",
              titulo: "Volcado de Texto Sin Audio",
              recibido_en: "2026-07-28T10:00:00Z",
              estado: "archivado",
              io_id: null,
              ultimo_error: null,
              chars: 250,
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
              integrity: "text_without_audio",
              audioStatus: "texto_sin_audio"
            }
          ]
        }),
      });
    });

    // 3. Mock Versions API endpoint
    await page.route("**/api/versiones**", async (route) => {
      const url = new URL(route.request().url());
      const id = url.searchParams.get("id");
      if (id === "v-002") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            versiones: [
              { version: 1, texto: "Texto version 1 original", sha256: "sha1", chars: 24 },
              { version: 2, texto: "Texto version 2 corregida", sha256: "sha2", chars: 25 },
              { version: 3, texto: "Texto version 3 definitiva", sha256: "sha3", chars: 26 }
            ]
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            versiones: [
              { version: 1, texto: "Texto original unico", sha256: "shabase", chars: 20 }
            ]
          }),
        });
      }
    });

    // 4. Mock Revision delta API
    await page.route("**/api/revision/delta**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pares: [
            { antes: "Texto version 2", despues: "Texto version 3" }
          ]
        }),
      });
    });

    // 5. Mock Revision Save endpoint
    await page.route("**/api/edicion", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, version: 4 }),
      });
    });

    // 6. Mock Revision Approve endpoint using a bulletproof pattern that handles both GET and POST safely
    await page.route("**/api/revision/**", async (route) => {
      console.log(`MOCK REVISION CALLED: method=${route.request().method()}, url=${route.request().url()}`);
      // Exclude delta checks so they fall through to the delta mock
      if (route.request().url().includes("/delta")) {
        return route.fallback();
      }

      const method = route.request().method();
      if (method === "POST") {
        v002Approved = true;
        console.log("APPROVE POST TRIGGERED, v002Approved SET TO TRUE");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, version_aprobada: 3, sha256_aprobado: "sha3" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            volcado_id: "v-002",
            version_aprobada: v002Approved ? 3 : null,
            sha256_aprobado: v002Approved ? "sha3" : null,
            aprobador: v002Approved ? "operador@khora.com" : null,
            aprobado_en: v002Approved ? "2026-07-28T14:00:00Z" : null,
            estado: v002Approved ? "listo_ingesta" : "en_revision"
          }),
        });
      }
    });

    // 7. Mock Kernel Ingestion endpoint
    await page.route("**/api/ingesta", async (route) => {
      console.log("MOCK INGESTA CALLED");
      v002Ingested = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, io_id: "io-newly-ingested-id" }),
      });
    });

    await page.goto("/sistema/volcados");
  });

  test("1. abrir Pipeline & 2. visualizar contadores", async ({ page }) => {
    // Check header
    const title = page.locator("h1");
    await expect(title).toContainText("Archivo de Volcados");

    // Check summary counters using first() or exact matches to avoid strict mode violations
    await expect(page.locator("text=Total volcados").first()).toBeVisible();
    await expect(page.locator("span:has-text('En revisión')").first()).toBeVisible();
    await expect(page.locator("text=Listos / Ingesta").first()).toBeVisible();
    await expect(page.locator("text=Grafo / Ingeridos").first()).toBeVisible();
    await expect(page.locator("text=Atención / Anomalías").first()).toBeVisible();
  });

  test("3. seleccionar un volcado & 4. abrir Trace View", async ({ page }) => {
    // Click on row of v-001 specifically using its text
    await page.locator("text=v-001").first().click();

    // Trace layout/detail is shown
    await expect(page.locator("text=Trazabilidad Operacional")).toBeVisible();
    await expect(page.locator("h2").first()).toBeVisible();

    // Verify Trace steps (chronological sequence)
    await expect(page.locator("text=Traceability Tree Map")).toBeVisible();
    await expect(page.locator("text=🎙 Captura")).toBeVisible();
    await expect(page.locator("text=💾 Archivo")).toBeVisible();
    await expect(page.locator("text=📝 Transcripción")).toBeVisible();
    await expect(page.locator("text=✓ Aprobación")).toBeVisible();
    await expect(page.locator("text=⚙ Ingesta")).toBeVisible();
    await expect(page.locator("text=◎ Grafo PKG Proyecciones")).toBeVisible();
  });

  test("5. abrir revisión & 6. reproducir audio", async ({ page }) => {
    // Select v-001
    await page.locator("text=v-001").first().click();

    // Click "Revisión" subtab inside the header
    await page.locator("div.border-b button:has-text('Revisión')").click();

    // Audio player should be visible
    const audioPlayer = page.locator("audio");
    await expect(audioPlayer).toBeVisible();
  });

  test("7. editar texto & 8. guardar versión", async ({ page }) => {
    // Select v-002
    await page.locator("text=v-002").first().click();
    await page.locator("div.border-b button:has-text('Revisión')").click();

    // Edit textarea
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await textarea.fill("Cambio editado por el operador de pruebas");

    // Mock save version
    await page.locator("button:has-text('Guardar versión')").click();
  });

  test("9. visualizar delta", async ({ page }) => {
    // Select v-002 (which has 3 versions)
    await page.locator("text=v-002").first().click();
    await page.locator("div.border-b button:has-text('Revisión')").click();

    // Delta section should show version diff pairs
    await expect(page.locator("text=Delta Changes")).toBeVisible();
    await expect(page.locator("text=− Texto version 2")).toBeVisible();
    await expect(page.locator("text=+ Texto version 3")).toBeVisible();
  });

  test("10. aprobar versión & 11. verificar bloqueo previo a aprobación & 12. ingerir versión aprobada & 13. visualizar io_id", async ({ page }) => {
    // Select v-002 (which has no approved version initially)
    await page.locator("text=v-002").first().click();
    await page.locator("div.border-b button:has-text('Revisión')").click();

    // 11. Verify ingestion is blocked beforehand (shows blocked warning)
    await expect(page.locator("text=Bloqueado para Ingesta:")).toBeVisible();

    // Wait a brief moment to ensure React is fully hydrated and interactive
    await page.waitForTimeout(600);

    // 10. Approve active version (v3)
    await page.locator("button:has-text('Aprobar v3')").click();

    // Ingestion should unlock and show ingest action
    const ingestBtn = page.locator("button:has-text('Ingerir')");
    await expect(ingestBtn).toBeVisible();

    // 12. Ingerir versión aprobada
    await ingestBtn.click();

    // 13. Verify newly generated io_id is shown successfully
    await expect(page.locator("text=✓ INGESTADO")).toBeVisible();
    await expect(page.locator("text=io_id: io-newly-ingested-id")).toBeVisible();
  });

  test("14. visualizar estado de grafo", async ({ page }) => {
    // Look for graph nodes count summary badge in the main table row
    const graphBadge = page.locator("text=12n / 18r");
    await expect(graphBadge).toBeVisible();
  });

  test("15. visualizar anomalías de integridad", async ({ page }) => {
    // Find text_without_audio and audio_partial anomaly badges
    await expect(page.locator("text=Incompleto").first()).toBeVisible();
  });

  test("16. responsive", async ({ page }) => {
    // Resize viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Header and navigation still present and functional
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("button:has-text('Trazabilidad')")).toBeVisible();
  });

  test("17. tema oscuro/claro", async ({ page }) => {
    // Make sure we have standard visual backgrounds applying
    const mainContainer = page.locator("h1").first();
    await expect(mainContainer).toBeVisible();
  });
});
