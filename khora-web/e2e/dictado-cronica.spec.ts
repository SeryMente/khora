import { test, expect } from "@playwright/test";

const owner = "synthetic-cronica-owner@example.invalid";
const textComplete = "Hoy a las 09:30, en el parque, al llegar, observé que estaba lloviendo y me sentí tranquila.";
const sha = "a".repeat(64);

async function openIngreso(page: any, archiveRequests: any[], checkpointSnapshots: any[]) {
  await page.route("**/api/dictado/checkpoint**", async (route: any) => {
    const request = route.request();
    if (request.method() === "GET") {
      const url = new URL(request.url());
      return route.fulfill({ json: url.searchParams.has("bootstrap") ? { owner } : { owner, items: [], recovery: null } });
    }
    const body = request.postDataJSON();
    checkpointSnapshots.push(body);
    return route.fulfill({ json: { ok: true, sessionId: body.sessionId, revisionId: body.revisionId, sha256: sha } });
  });
  await page.route("**/api/dictado", async (route: any) => {
    if (route.request().method() !== "POST" || new URL(route.request().url()).pathname !== "/api/dictado") return route.fallback();
    const body = route.request().postDataJSON();
    archiveRequests.push(body);
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "8ac26f30-df72-45c9-8d9a-e34f7c45d75a",
        sessionId: body.sessionId,
        sha256: sha,
        chars: body.texto.length,
        idempotent: false,
        handoff: body.mode === "cronica" ? { state: body.autoPublish ? "queued" : "disabled" } : undefined,
      }),
    });
  });
  await page.goto("/sistema/ingreso?modo=dictado");
  await expect(page.getByRole("heading", { name: "Ingreso", exact: true })).toBeVisible();
}

async function fillAndConfirm(page: any, value: string) {
  await page.getByRole("textbox", { name: "Texto de la captura" }).fill(value);
  const confirm = page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]');
  if (await confirm.count()) await confirm.click();
  await expect(page.locator('[data-ui-id="ingreso.btn-archivar"]')).toBeEnabled();
}

test("UI Crónica: cuatro pistas, hora relatada separada y handoff autorizado por defecto", async ({ page }) => {
  const archiveRequests: any[] = [];
  const checkpointSnapshots: any[] = [];
  await openIngreso(page, archiveRequests, checkpointSnapshots);

  await expect(page.locator('[data-ui-id="ingreso.cronica-checklist"]')).toHaveCount(0);
  await page.locator('[data-ui-id="ingreso.modalidad-cronica"]').click();
  await expect(page.locator('[data-ui-id="ingreso.cronica-checklist"]')).toBeVisible();
  const toggle = page.getByLabel("Publicar automáticamente al archivar (Crónica y microblog)");
  await expect(toggle).toBeChecked();

  await fillAndConfirm(page, textComplete);
  const checklist = page.locator('[data-ui-id="ingreso.cronica-checklist"]');
  await expect(checklist.getByText("4/4 pistas")).toBeVisible();
  for (const label of ["Fecha y hora", "Lugar", "Momento", "Qué pasa"]) await expect(checklist.getByText(label, { exact: true })).toBeVisible();

  await expect.poll(() => checkpointSnapshots.some(snapshot => snapshot.mode === "cronica" && snapshot.autoPublish === true)).toBe(true);
  const snapshot = checkpointSnapshots.find(value => value.mode === "cronica" && value.autoPublish === true);
  expect(snapshot.publicationIntentId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(snapshot.eventTime).toContain("Hoy a las 09:30");
  expect(snapshot.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(snapshot.eventTime).not.toBe(snapshot.capturedAt);

  const post = page.waitForResponse(response => response.url().endsWith("/api/dictado") && response.request().method() === "POST" && response.status() === 201);
  await page.locator('[data-ui-id="ingreso.btn-archivar"]').click();
  await post;
  expect(archiveRequests).toHaveLength(1);
  expect(archiveRequests[0].mode).toBe("cronica");
  expect(archiveRequests[0].autoPublish).toBe(true);
  expect(archiveRequests[0].publicationIntentId).toBe(snapshot.publicationIntentId);
  expect(archiveRequests[0].eventTime).toBe(snapshot.eventTime);
  expect(archiveRequests[0].capturedAt).toBe(snapshot.capturedAt);
  await expect(page.getByText("Captura archivada", { exact: true })).toBeVisible();
});

test("UI Crónica incompleta y checkmark desactivado: permite archivar sin autorizar handoff", async ({ page }) => {
  const archiveRequests: any[] = [];
  const checkpointSnapshots: any[] = [];
  await openIngreso(page, archiveRequests, checkpointSnapshots);
  await page.locator('[data-ui-id="ingreso.modalidad-cronica"]').click();
  const toggle = page.getByLabel("Publicar automáticamente al archivar (Crónica y microblog)");
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await fillAndConfirm(page, "No sé si mañana pasará algo.");
  await expect(page.locator('[data-ui-id="ingreso.cronica-checklist"]').getByText("0/4 pistas")).toBeVisible();
  const archive = page.locator('[data-ui-id="ingreso.btn-archivar"]');
  await expect(archive).toBeEnabled();
  const post = page.waitForResponse(response => response.url().endsWith("/api/dictado") && response.request().method() === "POST" && response.status() === 201);
  await archive.click();
  await post;
  expect(archiveRequests[0].mode).toBe("cronica");
  expect(archiveRequests[0].autoPublish).toBe(false);
  expect(archiveRequests[0].publicationIntentId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(archiveRequests[0].capturedAt).toBeTruthy();
  expect(archiveRequests[0].eventTime).toBeNull();
});

test("Dictado normal mantiene interfaz y payload sin autorización de Integración", async ({ page }) => {
  const archiveRequests: any[] = [];
  const checkpointSnapshots: any[] = [];
  await openIngreso(page, archiveRequests, checkpointSnapshots);
  await expect(page.locator('[data-ui-id="ingreso.cronica-checklist"]')).toHaveCount(0);
  await expect(page.locator('[data-ui-id="ingreso.cronica-auto-publish"]')).toHaveCount(0);
  await fillAndConfirm(page, "Texto normal de Dictado que se conserva sin cambios de modalidad.");
  const post = page.waitForResponse(response => response.url().endsWith("/api/dictado") && response.request().method() === "POST" && response.status() === 201);
  await page.locator('[data-ui-id="ingreso.btn-archivar"]').click();
  await post;
  expect(archiveRequests).toHaveLength(1);
  expect(archiveRequests[0]).not.toHaveProperty("mode");
  expect(archiveRequests[0]).not.toHaveProperty("autoPublish");
  expect(archiveRequests[0]).not.toHaveProperty("publicationIntentId");
});
