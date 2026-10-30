import test from "node:test";
import assert from "node:assert/strict";
import { approvePlan, createSession, listSources, JulesApiError, sendMessage } from "../../lib/jules/client";

const originalFetch = globalThis.fetch;
const originalKey = process.env.JULES_API_KEY;

test("Jules GET may retry a rate-limited read within the bounded policy", async () => {
  let attempts = 0;
  process.env.JULES_API_KEY = "synthetic-unit-test-key";
  globalThis.fetch = (async () => {
    attempts++;
    return attempts === 1
      ? new Response("rate limited", { status: 429 })
      : Response.json({ sources: [], nextPageToken: undefined });
  }) as typeof fetch;
  try {
    const result = await listSources(25);
    assert.equal(result.sources.length, 0);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.JULES_API_KEY; else process.env.JULES_API_KEY = originalKey;
  }
});

test("Jules POST network failure is ambiguous and is never retried", async () => {
  let attempts = 0;
  process.env.JULES_API_KEY = "synthetic-unit-test-key";
  globalThis.fetch = (async () => { attempts++; throw new TypeError("synthetic network interruption"); }) as typeof fetch;
  try {
    await assert.rejects(
      createSession({ prompt: "synthetic", sourceContext: { source: "sources/github/owner/repo", githubRepoContext: { startingBranch: "main" } }, requirePlanApproval: true }),
      (error: unknown) => error instanceof JulesApiError && error.message === "JULES_WRITE_RESULT_AMBIGUOUS" && error.status === 0,
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.JULES_API_KEY; else process.env.JULES_API_KEY = originalKey;
  }
});

test("Jules POST 5xx is surfaced as ambiguous without automatic replay", async () => {
  let attempts = 0;
  process.env.JULES_API_KEY = "synthetic-unit-test-key";
  globalThis.fetch = (async () => { attempts++; return new Response("synthetic upstream failure", { status: 500 }); }) as typeof fetch;
  try {
    await assert.rejects(
      createSession({ prompt: "synthetic", sourceContext: { source: "sources/github/owner/repo", githubRepoContext: { startingBranch: "main" } }, requirePlanApproval: true }),
      (error: unknown) => error instanceof JulesApiError && error.message === "JULES_WRITE_RESULT_AMBIGUOUS" && error.status === 500,
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.JULES_API_KEY; else process.env.JULES_API_KEY = originalKey;
  }
});
test("Jules POST create, message and approval never retry 429 responses", async () => {
  const calls = [
    () => createSession({ prompt: "synthetic", sourceContext: { source: "sources/github/owner/repo", githubRepoContext: { startingBranch: "main" } }, requirePlanApproval: true }),
    () => sendMessage("fixture-session", "synthetic"),
    () => approvePlan("fixture-session"),
  ];
  for (const call of calls) {
    let attempts = 0;
    process.env.JULES_API_KEY = "synthetic-unit-test-key";
    globalThis.fetch = (async () => { attempts++; return new Response("synthetic rate limit", { status: 429 }); }) as typeof fetch;
    try {
      await assert.rejects(call(), (error: unknown) => error instanceof JulesApiError && error.message === "JULES_RATE_LIMITED" && error.status === 429);
      assert.equal(attempts, 1);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.JULES_API_KEY; else process.env.JULES_API_KEY = originalKey;
    }
  }
});
test("Jules observability redacts complete source paths and session identifiers", () => {
  const source = sanitizeJulesRouteForLog("https://jules.googleapis.com/v1alpha/sources/github/private-org/secret-repo");
  assert.equal(source, "/v1alpha/sources/:id");
  const activities = sanitizeJulesRouteForLog("https://jules.googleapis.com/v1alpha/sessions/secret-session-id/activities");
  assert.equal(activities, "/v1alpha/sessions/:id/activities");
  assert.equal(sanitizeJulesRouteForLog("not a url"), "unknown");
});
