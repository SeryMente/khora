import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("runtime telemetry no conserva transporte de observaciones vía GitHub", () => {
  const contentPath = path.resolve(
    process.cwd(),
    "extension/harmonia/modules/live-caption/content.js",
  );
  const shellPath = path.resolve(
    process.cwd(),
    "extension/harmonia/core/shell.sw.js",
  );
  const content = fs.readFileSync(contentPath, "utf8");
  const shell = fs.readFileSync(shellPath, "utf8");

  assert.equal(content.includes("/api/observaciones/repo"), false);
  assert.equal(shell.includes("repository_commit"), false);
  assert.equal(shell.includes("/api/observaciones/repo"), false);
  assert.equal(content.includes("/api/observaciones/runtime"), true);
  assert.equal(shell.includes("runtime_event_store"), true);
});
