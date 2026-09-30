import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Batch 1: scheduler es por evento, agrupado y acotado", () => {
  const telemetry = read("extension/harmonia/core/telemetry.js");

  assert.match(telemetry, /const OBS_SYNC_DEBOUNCE_MS = 1000/);
  assert.match(telemetry, /const OBS_SYNC_MAX_WAIT_MS = 5000/);
  assert.match(telemetry, /const OBS_SYNC_BATCH_THRESHOLD = 10/);
  assert.match(telemetry, /const OBS_SYNC_BATCH_MAX_EVENTS = 50/);
  assert.match(telemetry, /scheduleObservationSync\("event"\)/);
  assert.match(telemetry, /chrome\.alarms\.get\(OBS_SYNC_ALARM\)/);
  assert.match(telemetry, /let telemetryWriteChain = Promise\.resolve\(\)/);
});

test("Batch 1: reinicio recupera pendientes y los fallos respetan backoff", () => {
  const telemetry = read("extension/harmonia/core/telemetry.js");
  const middleware = read("middleware.ts");
  const background = read("extension/harmonia/modules/live-caption/background.js");
  const deploy = fs.readFileSync(path.join(root, "../.github/workflows/deploy-production.yml"), "utf8");

  assert.ok(telemetry.includes("if (unsynced <= 0)"));
  assert.ok(telemetry.includes("if (nextRetryAt > now) delay = Math.max(delay, nextRetryAt - now)"));
  assert.ok(telemetry.includes('scheduleObservationSync("service_worker_init")'));
  assert.ok(middleware.includes("ep-main-live"));
  assert.ok(background.includes("https?:\\/\\/"));
  assert.equal(deploy.includes('--deployment "${DEPLOY_URL}"'), false);
  assert.ok(deploy.includes("ep-main-live.json"));
  assert.ok(deploy.includes("GITHUB_SHA"));
  const manifest = read("extension/harmonia/manifest.json");
  const builder = read("scripts/build-extension.mjs");
  assert.ok(manifest.includes('"modules/live-caption/content.js"'));
  assert.ok(manifest.includes('"alarms"'));
  assert.ok(manifest.includes('"https://khora-web.vercel.app/*"'));
  assert.ok(builder.includes("path.join(webRoot, 'extension', 'harmonia')"));
});

test("Batch 1: existe un único camino de envío y permite manual + automático", () => {
  const shell = read("extension/harmonia/core/shell.sw.js");
  const ui = read("extension/harmonia/core/aisthesis.js");
  const html = read("extension/harmonia/core/aisthesis.html");

  assert.match(shell, /var reportPromise = null/);
  assert.match(shell, /chrome\.alarms\.onAlarm\.addListener/);
  assert.match(shell, /message\.type\s*!==\s*["\']KHORA_REPORT_OBSERVATIONS["\']/);
  assert.match(shell, /type: "KHORA_OBSERVATION_REPORT_REQUEST"/);
  assert.match(html, /id="reportObservations"/);
  assert.match(ui, /type:"KHORA_REPORT_OBSERVATIONS"/);
});

test("Batch 1: el transporte de observaciones es directo al runtime y el content-script usa sesión", () => {
  const content = read("extension/harmonia/modules/live-caption/content.js");

  const runtimeRoute = read("app/api/observaciones/runtime/route.ts");
  const runtimeAdapter = read("lib/server/observation-runtime.ts");
  assert.match(runtimeRoute, /await auth\(\)/);
  assert.match(runtimeRoute, /x-khora-observation-source/);
  assert.match(runtimeAdapter, /registrarEventosBatch/);
  assert.doesNotMatch(content, /\/api\/observaciones\/repo/);
  assert.match(content, /\/api\/observaciones\/runtime/);
});

test("Batch 1: no quedan saltos de línea literales que inutilicen los scripts de extensión", () => {
  for (const file of [
    "extension/harmonia/core/aisthesis.js",
    "extension/harmonia/modules/live-caption/background.js",
    "extension/harmonia/modules/live-caption/content.js",
  ]) {
    assert.equal(read(file).includes("\\n"), false, file);
  }
});
