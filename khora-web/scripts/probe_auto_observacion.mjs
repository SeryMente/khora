/** Independent, read-only black-box probe. No dependency on Khora's DB/logging path. */
const raw = process.env.KHORA_BASE_URL;
if (!raw) throw new Error("KHORA_BASE_URL required");
const base = new URL(raw);
if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("HTTPS required");
if (base.username || base.password) throw new Error("Credentials in URL forbidden");
const authenticated = Boolean(process.env.KHORA_OBSERVATION_COOKIE);
try {
  const response = await fetch(new URL("/api/auto-observacion?limite=1", base), {
    signal: AbortSignal.timeout(8000), redirect: "manual", cache: "no-store",
    headers: authenticated ? { Cookie: process.env.KHORA_OBSERVATION_COOKIE } : {},
  });
  if (!authenticated) {
    const location = response.headers.get("location");
    const denied = [401, 403].includes(response.status) || ([302, 303, 307, 308].includes(response.status) && location && new URL(location, base).origin === base.origin && /auth|signin/.test(new URL(location, base).pathname));
    if (!denied) throw new Error("ANONYMOUS_ACCESS_NOT_DENIED");
    console.log(JSON.stringify({ check: "anonymous-boundary", result: "PASS", status: response.status, scope: "Access denial only; not authenticated availability or durable persistence" }));
  } else {
    if (response.status !== 200) throw new Error("AUTHENTICATED_READ_UNAVAILABLE");
    const data = await response.json();
    if (!Array.isArray(data.events) || data.events.length > 1 || !data.observed_at) throw new Error("INVALID_CONTRACT");
    const allowed = new Set(["id", "fase", "event_id", "estado", "outcome", "outcome_discrepancy", "correlacion_id", "servidor_en", "component", "duration_ms", "reason_code", "source"]);
    if (data.events.some(e => Object.keys(e).some(k => !allowed.has(k)))) throw new Error("UNEXPECTED_DIAGNOSTIC_FIELD");
    console.log(JSON.stringify({ check: "authenticated-read", result: "PASS", sample: data.events.length, scope: "Read contract only; no writes, source attestation or full coverage proof" }));
  }
} catch {
  // Never log an error object: fetch/proxy errors can contain endpoint credentials.
  console.error(JSON.stringify({ check: authenticated ? "authenticated-read" : "anonymous-boundary", result: "FAIL", reason: "PROBE_FAILED" }));
  process.exitCode = 1;
}
