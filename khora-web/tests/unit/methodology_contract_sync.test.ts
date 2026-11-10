import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const canonicalUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";
// Verified against SeryMente/metodologia main on 2026-11-10 through the GitHub
// connector. GitHub's blob SHA is stable for the exact canonical file bytes.
const canonicalGitBlobSha = "232590a1f6339e2517e67038e1b5f7e8bd1638e3";

function gitBlobSha(bytes: Buffer): string {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

test("KHORA local contract matches the canonical Metodología contract", async () => {
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const localBytes = fs.readFileSync(localPath);
  const local = JSON.parse(localBytes.toString("utf8"));
  const response = await fetch(canonicalUrl, { headers: { "User-Agent": "Khora-Contract-Sync-Test" } });

  if (response.ok) {
    const remote = await response.json();
    assert.deepEqual(local, remote);
    return;
  }

  // The canonical repository may be private. Prefer authenticated gh when present;
  // hosted builders without gh verify against the exact Git object SHA pinned above.
  const gh = spawnSync("gh", [
    "api", "-H", "Accept: application/vnd.github.raw+json",
    "repos/SeryMente/metodologia/contents/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json",
  ], { encoding: "utf8", timeout: 30000, env: { ...process.env, GH_PROMPT_DISABLED: "1" } });

  if (!gh.error && gh.status === 0) {
    assert.deepEqual(local, JSON.parse(gh.stdout));
    return;
  }
  if (gh.error && (gh.error as NodeJS.ErrnoException).code === "ENOENT") {
    assert.equal(
      gitBlobSha(localBytes),
      canonicalGitBlobSha,
      "Local contract diverges from the verified canonical Metodología Git object",
    );
    return;
  }

  throw new Error("Canonical Metodología contract could not be fetched or verified with GitHub CLI");
});
