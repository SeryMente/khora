import test from "node:test";
import assert from "node:assert/strict";
import {
  enviarEventosObservabilidadDictado,
  registrarEventoObservabilidadDictado,
} from "../../lib/client/dictado-observability";

function mockStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
    key(index: number) { return Array.from(values.keys())[index] ?? null; },
    get length() { return values.size; },
    values,
  };
}

async function withBrowser(
  handler: (state: { requests: Array<{ url: string; init: RequestInit }>; storage: ReturnType<typeof mockStorage>; replies: Array<() => Response | Promise<Response>> }) => Promise<void>,
) {
  const root = globalThis as any;
  const originalWindow = root.window;
  const originalDocument = root.document;
  const originalFetch = root.fetch;
  const storage = mockStorage();
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const replies: Array<() => Response | Promise<Response>> = [];
  root.window = { sessionStorage: storage, addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; } };
  root.document = { visibilityState: "visible", addEventListener() {} };
  root.fetch = async (url: string, init: RequestInit) => {
    requests.push({ url: String(url), init });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected_fetch");
    return await reply();
  };
  try { await handler({ requests, storage, replies }); }
  finally {
    root.window = originalWindow;
    root.document = originalDocument;
    root.fetch = originalFetch;
  }
}

function okResponse(accepted: number, duplicates = 0): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, summary: { accepted, duplicates, rejected: 0, total: accepted + duplicates }, results: [] }),
  } as Response;
}

test("dictation telemetry uses USER_DATA, drops raw transcript fields, and dequeues only after acknowledgement", async () => {
  await withBrowser(async ({ requests, storage, replies }) => {
    replies.push(() => okResponse(1));
    const eventId = registrarEventoObservabilidadDictado({
      sessionId: "11111111-1111-4111-8111-111111111111",
      eventName: "DICTADO_INICIO_SOLICITADO",
      outcome: "PENDING",
      metrics: {
        input_mode: "microfono",
        result_chars: 12,
        unapproved_metric: "raw transcript must never persist",
        transcript: "raw transcript must never persist",
      },
    });
    assert.ok(eventId);
    await enviarEventosObservabilidadDictado();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/eventos");
    const body = JSON.parse(String(requests[0].init.body));
    const event = body.events[0];
    assert.equal(body.events.length, 1);
    assert.equal(event.event_uuid, eventId);
    assert.equal(event.privacy_class, "USER_DATA");
    assert.equal(event.phase, "dictado");
    assert.equal(event.component, "ingreso_workspace");
    assert.equal(event.metrics.input_mode, "microfono");
    assert.equal(event.metrics.result_chars, 12);
    assert.equal("transcript" in event.metrics, false);
    assert.equal(JSON.stringify(event).includes("raw transcript must never persist"), false);
    assert.equal(JSON.parse(storage.values.get("khora:dictado:observability:v1:pending") || "[]").length, 0);
    await enviarEventosObservabilidadDictado();
    assert.equal(requests.length, 1);
  });
});

test("dictation event queue survives a failed HTTP response and retries with the same UUID and idempotency key", async () => {
  await withBrowser(async ({ requests, replies }) => {
    replies.push(() => ({ ok: false, status: 503, json: async () => ({ error: "unavailable" }) }) as Response);
    replies.push(() => okResponse(1));
    const eventId = registrarEventoObservabilidadDictado({
      sessionId: "22222222-2222-4222-8222-222222222222",
      eventName: "CHECKPOINT_FALLIDO",
      severity: "ERROR",
      outcome: "FAILURE",
      reasonCode: "network_error",
    });
    assert.ok(eventId);
    await enviarEventosObservabilidadDictado();
    await enviarEventosObservabilidadDictado();
    assert.equal(requests.length, 2);
    const first = JSON.parse(String(requests[0].init.body)).events[0];
    const second = JSON.parse(String(requests[1].init.body)).events[0];
    assert.equal(first.event_uuid, eventId);
    assert.equal(second.event_uuid, eventId);
    assert.equal(
      (requests[0].init.headers as Record<string, string>)["X-Idempotency-Key"],
      (requests[1].init.headers as Record<string, string>)["X-Idempotency-Key"],
    );
  });
});


test("dictation telemetry keeps the queue when the server explicitly rejects events", async () => {
  await withBrowser(async ({ requests, storage, replies }) => {
    replies.push(() => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, summary: { accepted: 0, duplicates: 0, rejected: 1, total: 1 }, results: [] }),
    }) as Response);
    const eventId = registrarEventoObservabilidadDictado({
      sessionId: "33333333-3333-4333-8333-333333333333",
      eventName: "CHECKPOINT_FALLIDO",
      severity: "ERROR",
      outcome: "FAILURE",
      reasonCode: "schema_rejected",
    });
    assert.ok(eventId);
    await enviarEventosObservabilidadDictado();

    const queued = JSON.parse(storage.values.get("khora:dictado:observability:v1:pending") || "[]");
    assert.equal(queued.length, 1);
    assert.equal(queued[0].event_uuid, eventId);
    assert.equal(requests.length, 1);
  });
});
