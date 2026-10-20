import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const canonicalUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";

test("KHORA local contract matches the canonical Metodología contract", async () => {
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
  // An explicit, content-addressed snapshot may be acquired by an authenticated
  // connection when this runner has no CLI session. Never use the local contract
  // as the source, skip comparison, or manufacture CLI output.
  const snapshotPath = process.env.METHODOLOGY_CANONICAL_SNAPSHOT;
  if (snapshotPath) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    assert.equal(snapshot.repository, "SeryMente/metodologia");
    assert.equal(snapshot.path, "FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
    assert.match(snapshot.commit, /^[a-f0-9]{40}$/);
    assert.match(snapshot.blob, /^[a-f0-9]{40}$/);
    assert.equal(typeof snapshot.content, "string");
    const data = Buffer.from(snapshot.content, "utf8");
    const blob = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
    assert.equal(blob, snapshot.blob, "canonical snapshot must match its acquired Git blob");
    assert.deepEqual(local, JSON.parse(snapshot.content));
    return;
  }
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
