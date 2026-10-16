import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const canonicalUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";

test("KHORA local contract matches the canonical Metodología contract", async () => {
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
  const response = await fetch(canonicalUrl, { headers: { "User-Agent": "Khora-Contract-Sync-Test" } });
  // A private canonical repository requires authenticated Contents API access.
  // Authentication failures remain failures; this test never skips the comparison.
  const remote = response.ok
    ? await response.json()
    : JSON.parse(execFileSync("gh", [
      "api", "-H", "Accept: application/vnd.github.raw+json",
      "repos/SeryMente/metodologia/contents/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json",
    ], { encoding: "utf8", timeout: 30000, env: { ...process.env, GH_PROMPT_DISABLED: "1" } }));
  assert.deepEqual(local, remote);
});
