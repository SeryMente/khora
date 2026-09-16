// @l0 L0-002 · @req KA-00/REQ-CHAT · Pruebas unitarias del endpoint proxy /api/chat y componentes de consulta
import "./setup";
import assert from "assert";
import test from "node:test";
import { POST } from "../../app/api/chat/route";
import { NextRequest } from "next/server";
import { buildConsultaState } from "../../lib/ui-review/states";

test("Proxy API /api/chat - Rechaza cuerpos de solicitud inválidos con HTTP 400", async () => {
  process.env.KHORA_API_URL = "http://localhost:8000";
  process.env.KHORA_API_KEY = "test-key";

  const req = new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ perfil: "" }), // Falta mensajes
  });

  const res = await POST(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("perfil"));
});

test("Proxy API /api/chat - Transmite stream SSE correctamente cuando el backend responde 200", async () => {
  process.env.KHORA_API_URL = "http://localhost:8000";
  process.env.KHORA_API_KEY = "test-key";

  const sseContent =
    'data: {"tipo":"chunk","texto":"Hola","origen":"llm:groq:model"}\n\ndata: {"tipo":"fin"}\n\n';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(sseContent, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }) as any;

  try {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        perfil: "groq",
        mensajes: [{ rol: "user", contenido: "Hola" }],
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("Content-Type"), "text/event-stream");

    const text = await res.text();
    assert.ok(text.includes('{"tipo":"chunk"'));
    assert.ok(text.includes('{"tipo":"fin"'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("buildConsultaState - Genera estados deterministas para escenarios sintéticos", () => {
  const idle = buildConsultaState("idle");
  assert.strictEqual(idle.perfil, "groq");
  assert.strictEqual(idle.generando, false);
  assert.ok(Array.isArray(idle.mensajes));

  const generating = buildConsultaState("generating");
  assert.strictEqual(generating.generando, true);

  const grafo = buildConsultaState("grafo");
  assert.strictEqual(grafo.modoGrafo, true);
  assert.ok(grafo.mensajes.some((m) => m.origen === "grafo"));

  const errorState = buildConsultaState("error");
  assert.ok(errorState.error && errorState.error.length > 0);
});
