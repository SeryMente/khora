import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ffmpeg from "ffmpeg-static";

function wave() {
  const samples = 44100, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(44100, 24); bytes.writeUInt32LE(88200, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 44100) * 8000), 44 + i * 2);
  return bytes;
}
async function fixture(page: Page, options: { open?: boolean; failPost?: boolean; verified?: boolean } = {}) {
  let open = options.open ?? false;
  const audio = wave(), posts: unknown[] = [];
  const mp3 = execFileSync(ffmpeg!, ['-hide_banner','-loglevel','error','-f','s16le','-ar','44100','-ac','1','-i','pipe:0','-f','mp3','-b:a','192k','pipe:1'], { input: audio.subarray(44) });
  const audioReads: string[] = [];
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname;
    if (p === "/api/auth/session") return route.fulfill({ json: { user: { email: "test@example.com", name: "Test" }, expires: "2099-01-01T00:00:00Z" } });
    if (p === "/api/volcados/pipeline") return route.fulfill({ json: {
      total: 2, counts: {}, integrity: { sync: 2 }, volcados: ["a", "b"].map((id, i) => ({ id, folio: i + 1, titulo: "Registro " + id, estado: "archivado", recibido_en: "2026-10-16T12:00:00Z", chars: 17, audio_status: "disponible", audio_url: "/api/audio/" + id, total_versiones: 1, integrity: "sync" }))
    } });
    if (p === "/api/versiones") return route.fulfill({ json: { versiones: [{ version: 1, texto: "Texto de prueba.", sha256: "a".repeat(64) }] } });
    if (p === "/api/boveda") {
      if (req.method() === "POST") {
        const data = req.postDataJSON(); posts.push(data);
        if (options.failPost) return route.abort("failed");
        if (data.pin !== "4826") return route.fulfill({ status: 401, json: { error: "pin_incorrecto" } });
        open = options.verified !== false;
        return route.fulfill({ json: { ok: true, abierta: true } });
      }
      return route.fulfill({ json: { configurado: true, abierta: open, minutos: 30 } });
    }
    if (p.startsWith("/api/audio/")) {
      if (!open) return route.fulfill({ status: 423, json: { error: "boveda_cerrada", detail: "Introduce el PIN" } });
      if (p.endsWith('/mp3')) { audioReads.push(p); return route.fulfill({ contentType: 'audio/mpeg', body: mp3, headers: { 'X-Audio-SHA256': createHash('sha256').update(mp3).digest('hex'), 'X-Captura-Completa': 'true', 'X-Audio-Hasta-Parte': '1' } }); }
      if (p.endsWith("/manifiesto")) return route.fulfill({ json: { audio_status: "disponible", custodia: { ok: true }, bytes_totales: audio.length, partes: [{ part_index: 1, start_ms: 0, end_ms: 1000, duracion_ms: 1000, download_path: p.replace("/manifiesto", "/parte/1") }] } });
      if (!p.includes("/parte/")) audioReads.push(p);
      return route.fulfill({ contentType: "audio/wav", body: audio });
    }
    if (p.includes("/compuerta")) return route.fulfill({ json: { canApprove: false, blockers: [], warnings: [], counts: {} } });
    if (p.includes("/incidentes")) return route.fulfill({ json: { incidentes: [] } });
    if (p.includes("/hallazgos")) return route.fulfill({ json: { hallazgos: [] } });
    return route.fulfill({ json: {} });
  });
  return { posts, audioReads, expire: () => { open = false; } };
}
const downloadButton = (page: Page) => page.locator('[data-ui-id="revision.btn-download-mp3"]');

test("Custodia: PIN incorrecto, corrección y MP3 real sin cambiar de pantalla", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/sistema/custodia");
  await expect(page.getByRole("heading", { name: "Custodia", exact: true })).toBeVisible();
  await downloadButton(page).click();
  const panel = page.getByRole("region", { name: "Desbloquear audio en Custodia" });
  const input = page.getByLabel("PIN de la bóveda");
  await input.fill("1111"); await panel.getByRole("button", { name: "Desbloquear y descargar MP3" }).click();
  await expect(panel.getByRole("alert")).toHaveText("PIN incorrecto. Inténtalo de nuevo.");
  await expect(input).toHaveValue(""); expect(state.audioReads).toEqual([]);
  await input.fill("4826");
  const downloaded = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Desbloquear y descargar MP3" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("khora-custodia-1.mp3");
  const bytes = await readFile((await file.path())!); expect(bytes.length).toBeGreaterThan(1000);
  const duration = await page.evaluate(async b => { const context = new AudioContext(); try { return (await context.decodeAudioData(new Uint8Array(b).buffer)).duration; } finally { await context.close(); } }, [...bytes]);
  expect(duration).toBeGreaterThan(0.9); expect(duration).toBeLessThan(1.2);
  await expect(page).toHaveURL(/\/sistema\/custodia$/);
  expect(state.posts).toEqual([{ pin: "1111", unlockOnly: true }, { pin: "4826", unlockOnly: true }]);
  expect(state.audioReads).toEqual(["/api/audio/a/mp3"]);
  expect(await page.evaluate(() => Object.values(localStorage).join(" ") + Object.values(sessionStorage).join(" "))).not.toContain("4826");
});

test("la caducidad durante descarga vuelve a pedir PIN en Custodia", async ({ page }) => {
  const state = await fixture(page, { open: true }); await page.goto("/sistema/custodia");
  await expect(page.locator('[data-ui-id="revision.btn-play-pause"]')).toBeEnabled();
  state.expire(); await downloadButton(page).click();
  await expect(page.getByRole("button", { name: "Desbloquear y descargar MP3" })).toBeVisible();
  expect(state.audioReads).toEqual([]); await expect(page).toHaveURL(/\/sistema\/custodia$/);
});

test("cambiar de registro cancela la descarga pendiente", async ({ page }) => {
  const state = await fixture(page); await page.goto("/sistema/custodia"); await downloadButton(page).click();
  await expect(page.getByRole("button", { name: "Cancelar descarga pendiente" })).toBeVisible();
  await page.getByText("Registro b", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancelar descarga pendiente" })).toHaveCount(0);
  await page.getByLabel("PIN de la bóveda").fill("4826");
  await page.getByRole("button", { name: "Desbloquear audio", exact: true }).click();
  await expect(page.getByRole("region", { name: "Desbloquear audio en Custodia" })).toHaveCount(0);
  expect(state.audioReads).toEqual([]);
});

test("fallo de red no desbloquea ni descarga", async ({ page }) => {
  const state = await fixture(page, { failPost: true }); await page.goto("/sistema/custodia"); await downloadButton(page).click();
  await page.getByLabel("PIN de la bóveda").fill("4826"); await page.getByRole("button", { name: "Desbloquear y descargar MP3" }).click();
  await expect(page.getByRole("region", { name: "Desbloquear audio en Custodia" }).getByRole("alert")).toBeVisible();
  expect(state.audioReads).toEqual([]); await expect(page).toHaveURL(/\/sistema\/custodia$/);
});

test("respuesta positiva sin cookie vigente no autoriza descarga", async ({ page }) => {
  const state = await fixture(page, { verified: false }); await page.goto("/sistema/custodia"); await downloadButton(page).click();
  await page.getByLabel("PIN de la bóveda").fill("4826"); await page.getByRole("button", { name: "Desbloquear y descargar MP3" }).click();
  await expect(page.getByText("El desbloqueo no quedó vigente. Inténtalo de nuevo sin salir de Custodia.")).toBeVisible();
  expect(state.audioReads).toEqual([]);
});

test("alias histórico conserva identificador y versión", async ({ page }) => {
  await fixture(page); await page.goto("/sistema/volcados?volcado_id=b&version=1&extra=x&extra=y");
  await expect(page).toHaveURL(/\/sistema\/custodia\?volcado_id=b&version=1&extra=x&extra=y$/);
  await expect(page.getByRole("heading", { name: "Custodia", exact: true })).toBeVisible();
});

test("servidor real sigue bloqueando audio y PIN sin autorización", async ({ request }) => {
  const manifest = await request.get("/api/audio/synthetic-custodia/manifiesto"); expect(manifest.status()).toBe(423);
  const unlock = await request.post("/api/boveda", { data: { pin: "4826", unlockOnly: true } }); expect(unlock.status()).toBe(401);
});

test("Custodia mantiene formulario utilizable en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await fixture(page); await page.goto("/sistema/custodia");
  await expect(page.getByLabel("PIN de la bóveda")).toBeVisible();
  const form = page.getByRole("region", { name: "Desbloquear audio en Custodia" });
  expect(await form.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(page.getByRole("link", { name: "Custodia", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volcados", exact: true })).toHaveCount(0);
});
