import assert from "assert";
import test from "node:test";
import { transcribeStoredSession } from "../../lib/client/authoritative-transcription";

test("authoritative transcription sends only a session reference", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const result = await transcribeStoredSession(
    "session-123",
    "texto preliminar",
    async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({ exito: true, textoFinal: "texto final" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  );

  assert.equal(capturedUrl, "/api/transcribir/sesion");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    sessionId: "session-123",
    previewText: "texto preliminar",
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.textoFinal, "texto final");
});

test("authoritative transcription converts plain-text 413 into a controlled result", async () => {
  const result = await transcribeStoredSession(
    "session-123",
    "preview",
    async () => new Response("Request Entity Too Large", { status: 413 }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.match(result.data.detail, /excedió el límite/i);
  assert.doesNotMatch(result.data.detail, /SyntaxError/i);
});

test("authoritative transcription preserves JSON server errors", async () => {
  const result = await transcribeStoredSession(
    "session-123",
    "preview",
    async () =>
      new Response(
        JSON.stringify({ detail: "Groq temporalmente no disponible" }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        },
      ),
  );

  assert.equal(result.ok, false);
  assert.equal(result.data.detail, "Groq temporalmente no disponible");
});
