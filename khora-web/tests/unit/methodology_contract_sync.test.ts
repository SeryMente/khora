import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const canonicalUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";

test("KHORA local contract matches the canonical Metodología contract", async (t) => {
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
  let response: Response;
  try {
    response = await fetch(canonicalUrl, { headers: { "User-Agent": "Khora-Contract-Sync-Test" } });
  } catch (error) {
    t.skip("canonical contract endpoint unreachable in this environment: " + String(error));
    return;
  }
  assert.equal(response.ok, true, "canonical contract fetch failed: " + response.status);
  const remote = await response.json();
  assert.deepEqual(local, remote);
});
