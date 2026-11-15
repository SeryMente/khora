import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextResponse } from "next/server";

test("/api/dictado: Crónica exige autenticación y deriva owner de auth(), no del payload", async () => {
  const source = readFileSync("app/api/dictado/route.ts", "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let user: { email: string } | null = null;
  const calls: any[] = [];
  const sessionClaims: any[] = [];
  const afterCallbacks: Function[] = [];
  const mockGuardar = async (entry: any) => {
    calls.push(entry);
    return {
      id: "8ac26f30-df72-45c9-8d9a-e34f7c45d75a",
      sha256: "a".repeat(64),
      chars: entry.texto.length,
      sessionId: entry.sessionId,
      idempotent: calls.length > 1,
      ...(entry.mode === "cronica" ? { handoff: { state: entry.autoPublish ? "queued" : "disabled" } } : {}),
    };
  };
  const request = (body: unknown) => new Request("https://khora.example.test/api/dictado", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const requireActual = createRequire(import.meta.url);
  const module = { exports: {} as any };
  const requireMock = (name: string) => {
    if (name === "@/auth") return { auth: async () => user ? { user } : null };
    if (name === "next/server") return { NextResponse, after: (callback: Function) => { afterCallbacks.push(callback); } };
    if (name === "../../../lib/server/dictado") return { guardarDictado: mockGuardar };
    if (name === "@/lib/server/custodia-schema") return { reclamarSesion: async (sessionId: string, owner: string) => { sessionClaims.push({ sessionId, owner }); } };
    if (name === "@/lib/server/custodia-trabajos") return { reconciliarCustodia: async () => ({ processed: 0 }) };
    if (name === "../../../lib/server/titulos") return {
      generarTituloConGarantia: async () => ({ title: "Título" }),
      generarTituloFallback: () => ({ title: "Fallback" }),
      generarTituloDeUltimoRecurso: () => "Fallback",
    };
    return requireActual(name);
  };
  new Function("require", "module", "exports", js)(requireMock, module, module.exports);
  const POST = module.exports.POST as (req: Request) => Promise<Response>;
  const intentId = "10dc7a9e-563c-4bd2-84a6-9e68f67c21fb";
  const sessionId = "d3f2357e-2364-44cf-973f-f7f2b24643ab";
  const capturedAt = "2026-11-15T17:30:00.000Z";
  const payload = {
    texto: "Hoy a las 09:30, en el parque, al llegar, observé que estaba lloviendo.",
    titulo: "Crónica de prueba",
    sessionId,
    mode: "cronica",
    autoPublish: true,
    publicationIntentId: intentId,
    eventTime: "Hoy a las 09:30",
    capturedAt,
    usuario: "forged-owner@example.invalid",
  };

  try {
    assert.equal((await POST(request(payload))).status, 401);
    assert.equal(calls.length, 0);

    user = { email: "authenticated-owner@example.invalid" };
    const badMode = await POST(request({ ...payload, mode: "integracion" }));
    assert.equal(badMode.status, 400);
    assert.equal(calls.length, 0);

    const first = await POST(request(payload));
    assert.equal(first.status, 201);
    const firstJson = await first.json() as any;
    assert.equal(firstJson.handoff.state, "queued");
    assert.equal(calls[0].usuario, user.email);
    assert.notEqual(calls[0].usuario, payload.usuario);
    assert.equal(calls[0].publicationIntentId, intentId);
    assert.equal(calls[0].sessionId, sessionId);
    assert.equal(calls[0].autoPublish, true);
    assert.equal(calls[0].eventTime, payload.eventTime);
    assert.equal(calls[0].capturedAt, capturedAt);
    assert.deepEqual(sessionClaims[0], { sessionId, owner: user.email });

    const retry = await POST(request(payload));
    assert.equal(retry.status, 201);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].usuario, user.email);
    assert.equal(calls[1].publicationIntentId, intentId);
    assert.equal(calls[1].sessionId, sessionId);
    assert.equal(calls[1].autoPublish, true);

    const disabled = await POST(request({ ...payload, sessionId: "d89cf49f-6c49-46e7-a6bc-9a3d9c292f1e", publicationIntentId: "2dff89b6-6504-4e43-b6f2-9c5dbf26f2a4", autoPublish: false, usuario: "attacker" }));
    assert.equal(disabled.status, 201);
    assert.equal((await disabled.json() as any).handoff.state, "disabled");
    assert.equal(calls[2].usuario, user.email);
    assert.equal(calls[2].autoPublish, false);

    const normal = await POST(request({ texto: "Dictado normal sin modalidad adicional.", titulo: "Normal", sessionId: "cb81aede-3fdd-4e91-9f41-0a7c4c5da556", fuenteEntrada: "texto", usuario: "attacker" }));
    assert.equal(normal.status, 201);
    assert.equal(calls[3].usuario, user.email);
    assert.equal("mode" in calls[3], false);
    assert.equal("autoPublish" in calls[3], false);
    assert.ok(afterCallbacks.length >= 4);
  } finally {
    user = null;
  }
});
