import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Batch 1: scheduler es por evento, agrupado y acotado", () => {
  const telemetry = read("extension/harmonia/core/telemetry.js");

  assert.match(telemetry, /const OBS_SYNC_DEBOUNCE_MS = 5000/);
  assert.match(telemetry, /const OBS_SYNC_MAX_WAIT_MS = 30000/);
  assert.match(telemetry, /const OBS_SYNC_BATCH_THRESHOLD = 25/);
  assert.match(telemetry, /const OBS_SYNC_BATCH_MAX_EVENTS = 50/);
  assert.match(telemetry, /scheduleObservationSync\("event"\)/);
  assert.match(telemetry, /chrome\.alarms\.get\(OBS_SYNC_ALARM\)/);
  assert.match(telemetry, /let telemetryWriteChain = Promise\.resolve\(\)/);
});

test("Batch 1: existe un único camino de envío y permite manual + automático", () => {
  const shell = read("extension/harmonia/core/shell.sw.js");
  const ui = read("extension/harmonia/core/aisthesis.js");

  assert.match(shell, /var reportPromise = null/);
  assert.match(shell, /chrome\.alarms\.onAlarm\.addListener/);
  assert.match(shell, /type:\s*["\']KHORA_REPORT_OBSERVATIONS["\']/);
  assert.match(shell, /type: "KHORA_OBSERVATION_REPORT_REQUEST"/);
  assert.match(ui, /id="reportObservations"/);
  assert.match(ui, /type:"KHORA_REPORT_OBSERVATIONS"/);
});

test("Batch 1: el token GitHub queda del lado servidor y el content-script usa sesión", () => {
  const route = read("app/api/observaciones/repo/route.ts");
  const repository = read("lib/server/observation-repository.ts");
  const content = read("extension/harmonia/modules/live-caption/content.js");

  assert.match(route, /await auth\(\)/);
  assert.match(route, /x-khora-observation-source/);
  assert.match(repository, /process\.env\.GITHUB_TOKEN/);
  assert.doesNotMatch(content, /GITHUB_TOKEN/);
  assert.match(content, /\/api\/observaciones\/repo/);
  assert.match(content, /X-Khora-Observation-Source/);
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
