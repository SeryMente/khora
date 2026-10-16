import { test, expect } from "@playwright/test";
const profile = "synthetic-owner-for-e2e";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/dictado-experience", async route => {
    if (route.request().method() === "POST") return route.fulfill({ json: { ok: true, id: route.request().postDataJSON().id, status: "saved" } });
    await route.fulfill({ json: { records: [], profileKey: profile, truncated: false, retentionDays: 90, summary: { sessions: 0, ended: 0, protectedChecks: 0, protectedChanges: 0, paintSamples: 0, paintP50: null, paintP95: null, shown: 0, sampled: { total: 0, pleasant: 0, neutral: 0, aversive: 0, commentOnly: 0 }, voluntary: { total: 0, pleasant: 0, neutral: 0, aversive: 0, commentOnly: 0 } } } });
  });
  await page.goto("/sistema/ingreso?modo=dictado");
});
test("comentario libre solo: captura humana por teclado, envío privado y acuse", async ({ page }) => {
  await page.getByRole("button", { name: "Dar opinión", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Comentario adicional" });
  await input.pressSequentially("Me agrada el ritmo; quiero conservar esta fluidez.", { delay: 4 });
  const request = page.waitForRequest(r => r.url().endsWith("/api/dictado-experience") && r.method() === "POST");
  await page.getByRole("button", { name: "Enviar opinión", exact: true }).click();
  const r = await request;
  expect(r.postDataJSON().data.rating).toBe(null);
  expect(r.postDataJSON().data.comment).toBe("Me agrada el ritmo; quiero conservar esta fluidez.");
  expect(r.headers()["x-khora-experience-profile"]).toBe(profile);
  await expect(page.getByRole("status")).toHaveText("Opinión guardada.");
});
test("opcional, vacío no enviable y omitir no envía comentario", async ({ page }) => {
  let posts = 0; page.on("request", r => { if (r.url().endsWith("/api/dictado-experience") && r.method() === "POST") posts++; });
  await page.getByRole("button", { name: "Dar opinión", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enviar opinión", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Comentario adicional" }).pressSequentially("Borrador no enviado");
  await page.getByRole("button", { name: "Omitir", exact: true }).click();
  expect(posts).toBe(0);
});
test("error de entrega: conserva comentario y no simula guardado", async ({ page }) => {
  await page.route("**/api/dictado-experience", async route => {
    if (route.request().method() === "POST") return route.fulfill({ status: 503, json: { error: "No se pudo guardar. Reintenta." } });
    await route.fallback();
  });
  await page.getByRole("button", { name: "Dar opinión", exact: true }).click();
  await page.getByRole("textbox", { name: "Comentario adicional" }).pressSequentially("Quiero que esto se conserve");
  await page.getByRole("button", { name: "Enviar opinión", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No se pudo guardar");
  await expect(page.getByRole("textbox", { name: "Comentario adicional" })).toHaveValue("Quiero que esto se conserve");
});
test("panel distingue medición ausente y no captura texto por defecto", async ({ page }) => {
  await page.getByRole("button", { name: "Calidad del dictado", exact: true }).click();
  await expect(page.getByLabel("Activar mediciones y encuestas breves del dictado")).not.toBeChecked();
  await expect(page.getByText("Sin comprobaciones suficientes", { exact: false })).toBeVisible();
  await expect(page.getByText("No es tiempo desde que hablaste.", { exact: false })).toBeVisible();
});

test("encuesta muestreada: solo después de detener, sin foco forzado ni texto en métricas", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem("khora:experience:v1:" + key, JSON.stringify({ enabled: true, sampling: { day: "", count: 0, last: 0 } }));
    const w = window as any;
    class Recognition {
      onstart?: () => void; onend?: () => void;
      start() { setTimeout(() => this.onstart?.(), 0); }
      stop() { setTimeout(() => this.onend?.(), 0); }
    }
    w.SpeechRecognition = w.webkitSpeechRecognition = Recognition;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => { throw new DOMException("Synthetic no microphone", "NotAllowedError"); } } });
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((a: any) => { if (a instanceof Uint32Array && a.length === 1) { a[0] = 0; return a; } return original(a); }) as typeof crypto.getRandomValues;
  }, profile);
  await page.clock.install();
  const payloads: any[] = [];
  page.on("request", r => { if (r.url().endsWith("/api/dictado-experience") && r.method() === "POST") payloads.push(r.postDataJSON()); });
  await page.reload();
  await page.getByRole("button", { name: "Calidad del dictado", exact: true }).click();
  await expect(page.getByLabel("Activar mediciones y encuestas breves del dictado")).toBeChecked();
  await page.locator('[data-ui-id="ingreso.btn-iniciar"]').click();
  await page.clock.runFor(100);
  await expect(page.getByRole("button", { name: "Dar opinión", exact: true })).toBeDisabled();
  await page.clock.runFor(61_000);
  await expect(page.getByRole("textbox", { name: "Comentario adicional" })).toHaveCount(0);
  await page.locator('[data-ui-id="ingreso.btn-detener"]').click();
  await page.clock.runFor(1000);
  await expect(page.getByRole("textbox", { name: "Comentario adicional" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Comentario adicional" })).not.toBeFocused();
  await expect.poll(() => payloads.some(p => p.data.kind === "session")).toBe(true);
  expect(payloads.filter(p => p.data.kind === "session").every(p => p.data.metrics.duration_ms >= 60_000)).toBe(true);
  expect(payloads.every(p => p.data.kind !== "feedback")).toBe(true);
});
