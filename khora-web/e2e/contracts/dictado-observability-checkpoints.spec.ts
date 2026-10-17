import { test, expect } from "@playwright/test";

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

test("dictation checkpoints persist start, immediate inline-edit pause, resume, and stale recognizer evidence", async ({ page }) => {
  const recordedEvents: Array<Record<string, any>> = [];

  await page.addInitScript(() => {
    localStorage.setItem("khora_auth_session", JSON.stringify({ authenticated: true, timestamp: Date.now() }));
  });
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = "es-MX";
      onstart: any = null;
      onresult: any = null;
      onerror: any = null;
      onend: any = null;
      private started = false;

      start() {
        if (this.started) return;
        this.started = true;
        setTimeout(() => {
          if (!this.started) return;
          this.onstart?.();
          const result = { 0: { transcript: "frase confidencial de prueba", confidence: 1 }, isFinal: true, length: 1 };
          this.onresult?.({ resultIndex: 0, results: [result] });
        }, 20);
      }

      stop() {
        this.started = false;
        if (this.onend) setTimeout(() => this.onend?.(), 300);
      }

      abort() {
        this.started = false;
        if (this.onend) setTimeout(() => this.onend?.(), 300);
      }
    }
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });

  await page.route("**/api/eventos", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON() as { events?: Array<Record<string, any>> };
    const batch = Array.isArray(payload?.events) ? payload.events : [];
    recordedEvents.push(...batch);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        summary: { accepted: batch.length, duplicates: 0, rejected: 0, total: batch.length },
        results: batch.map((event) => ({ event_uuid: event.event_uuid, status: "accepted" })),
      }),
    });
  });

  await page.route("**/api/dictado/checkpoint", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ owner: "synthetic-custody-owner@example.invalid", recovery: null }) });
    }
  });

  await page.goto("/sistema/ingreso?modo=dictado");
  await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
  await expect(page.locator('[data-ui-id="ingreso.btn-iniciar"]')).toBeVisible();
  await page.locator('[data-ui-id="ingreso.btn-iniciar"]').click();
  await expect.poll(
    () => recordedEvents.some((event) => event.event_name === "RECONOCEDOR_INICIADO"),
    { timeout: 7000 },
  ).toBeTruthy();

  const textarea = page.locator('textarea[data-ui-id="ingreso.textarea"]').first();
  await textarea.focus();
  await expect.poll(
    () => recordedEvents.some((event) => event.event_name === "DICTADO_PAUSA_POR_EDICION") &&
      recordedEvents.some((event) => event.event_name === "DICTADO_PAUSADO_POR_EDICION"),
    { timeout: 7000 },
  ).toBeTruthy();

  await textarea.fill("texto editado en la prueba");
  await page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]').click();
  await expect.poll(
    () => recordedEvents.some((event) => event.event_name === "REANUDACION_POR_EDICION_COMPLETADA"),
    { timeout: 7000 },
  ).toBeTruthy();
  await expect.poll(
    () => recordedEvents.some((event) => event.event_name === "REARME_INSTANCIA_ANTERIOR"),
    { timeout: 7000 },
  ).toBeTruthy();

  await page.locator('[data-ui-id="ingreso.btn-detener"]').click();
  await expect.poll(
    () => recordedEvents.some((event) => event.event_name === "DICTADO_DETENIDO"),
    { timeout: 7000 },
  ).toBeTruthy();

  const requiredCheckpoints = [
    "DICTADO_INICIO_SOLICITADO",
    "DICTADO_INICIO_ACEPTADO",
    "EDICION_IN_SITU_INICIADA",
    "DICTADO_PAUSA_POR_EDICION",
    "DICTADO_PAUSADO_POR_EDICION",
    "DICTADO_DETENCION_SOLICITADA",
    "DICTADO_DETENIDO",
    "EDICION_IN_SITU_CIERRE_INICIADO",
    "EDICION_IN_SITU_CONFIRMADA",
    "REANUDACION_POR_EDICION_SOLICITADA",
    "REANUDACION_POR_EDICION_COMPLETADA",
    "REARME_INSTANCIA_ANTERIOR",
  ];
  for (const checkpoint of requiredCheckpoints) {
    expect(recordedEvents.some((event) => event.event_name === checkpoint), checkpoint).toBe(true);
  }

  const serialized = JSON.stringify(recordedEvents);
  expect(serialized.includes("frase confidencial de prueba")).toBe(false);
  expect(serialized.includes("texto editado en la prueba")).toBe(false);
  for (const event of recordedEvents) {
    expect(event.privacy_class).toBe("USER_DATA");
    expect(event.phase).toBe("dictado");
    expect(event.event_uuid).toBeTruthy();
    expect(event.session_id).toBeTruthy();
    for (const key of Object.keys(event.metrics || {})) {
      expect(key.toLowerCase()).not.toMatch(/text|audio|speech|transcript/);
    }
  }
});
