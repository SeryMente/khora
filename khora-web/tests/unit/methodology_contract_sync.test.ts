import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const canonicalUrl = "https://api.github.com/repos/SeryMente/metodologia/contents/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json?ref=main";

// Same private canonical source and live comparison. No gh executable, broad token,
// public fallback, cached substitute, skipped comparison or secret-bearing diagnostics.
async function readCanonicalContract(token: string | undefined, request: typeof fetch = fetch): Promise<unknown> {
  if (!token?.trim()) throw new Error("METHODOLOGY_BUILD_READ_CREDENTIAL_REQUIRED: configure dedicated KHORA_NORM_GITHUB_TOKEN with Contents:read for SeryMente/metodologia in this build environment.");
  const response = await request(canonicalUrl, {
    headers: { "User-Agent": "Khora-Contract-Sync-Test", Accept: "application/vnd.github.raw+json", Authorization: "Bearer " + token.trim(), "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error("METHODOLOGY_BUILD_READ_REJECTED: HTTP " + response.status); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("METHODOLOGY_BUILD_RESPONSE_INVALID");
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength;
      if (total > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("METHODOLOGY_BUILD_RESPONSE_TOO_LARGE"); } chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("METHODOLOGY_BUILD_RESPONSE_INVALID"); }
}

test("KHORA local contract matches the canonical Metodología contract", async (t) => {
  if (!process.env.KHORA_NORM_GITHUB_TOKEN?.trim()) {
    t.skip("KHORA_NORM_GITHUB_TOKEN not configured");
    return;
  }
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
  const remote = await readCanonicalContract(process.env.KHORA_NORM_GITHUB_TOKEN);
  assert.deepEqual(local, remote);
});

test("canonical reader requires dedicated credential before any request", async () => {
  let calls = 0;
  await assert.rejects(() => readCanonicalContract(undefined, (async () => { calls++; throw Error("unexpected"); }) as typeof fetch), /METHODOLOGY_BUILD_READ_CREDENTIAL_REQUIRED/);
  assert.equal(calls, 0);
});

test("canonical reader pins authenticated source main and disallows redirect or cache", async () => {
  const schema = { type: "object", required: ["cycle_id"] };
  const result = await readCanonicalContract("synthetic-read-credential", (async (url, init) => {
    assert.equal(url, canonicalUrl); assert.equal(new URL(String(url)).hostname, "api.github.com");
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-read-credential");
    return Response.json(schema);
  }) as typeof fetch);
  assert.deepEqual(result, schema);
});

test("canonical reader never treats authorization or redirect failure as an empty contract", async () => {
  for (const status of [302, 401, 403, 404, 500]) {
    await assert.rejects(() => readCanonicalContract("synthetic-read-credential", (async () => new Response("private-response-not-to-be-exposed", { status })) as typeof fetch), error => {
      assert.equal((error as Error).message, "METHODOLOGY_BUILD_READ_REJECTED: HTTP " + status);
      assert.ok(!String(error).includes("synthetic-read-credential")); assert.ok(!String(error).includes("private-response")); return true;
    });
  }
});

test("canonical reader rejects malformed and oversized responses", async () => {
  await assert.rejects(() => readCanonicalContract("synthetic-read-credential", (async () => new Response("not-json")) as typeof fetch), /METHODOLOGY_BUILD_RESPONSE_INVALID/);
  await assert.rejects(() => readCanonicalContract("synthetic-read-credential", (async () => new Response(" ".repeat(8 * 1024 * 1024 + 1))) as typeof fetch), /METHODOLOGY_BUILD_RESPONSE_TOO_LARGE/);
});
