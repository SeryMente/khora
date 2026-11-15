import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";

function loadRoute() {
  let requestedTracks: any[] = [];
  const actual = createRequire(import.meta.url);
  const source = readFileSync("app/api/transcribir/dialogo/route.ts", "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as Record<string, any> };
  const requireMock = (name: string) => {
    if (name === "next/server" || name === "next/server.js") return { NextRequest, NextResponse };
    if (name === "@/auth") return { auth: async () => ({ user: { email: "fallback-owner@example.invalid" } }) };
    if (name === "@/lib/server/audio-dialogo") return {
      cargarAudioDialogo: async () => ({
        pistas: [
          { fuente: "microphone", bytes: Buffer.from("user-original"), offsetMs: 0 },
          { fuente: "chrome_tab", bytes: Buffer.from("chrome-original"), offsetMs: 0 },
        ],
        manifest: { estado: "detenido", etiquetas: { microphone: "USUARIO", chrome_tab: "CHROME" } },
      }),
    };
    if (name === "@/lib/server/transcribir") return {
      transcribirAudioConGroq: async () => ({ texto: "vivo", exito: true, segmentos: [] }),
    };
    if (name === "@/lib/dialogo/transcribir") return {
      transcribirPistasDialogo: async (tracks: any[]) => {
        requestedTracks = tracks;
        return {
          turnos: [{ fuente: "microphone", start_ms: 0, end_ms: 500, texto: "Reconstruido" }],
          fuentesFallidas: ["chrome_tab"],
          estadoTranscripcion: "parcial",
        };
      },
    };
    if (name === "@/lib/dialogo/contrato") return { formatearDialogo: () => "USUARIO: Reconstruido" };
    return actual(name);
  };
  new Function("require", "module", "exports", js)(requireMock, module, module.exports);
  return {
    POST: module.exports.POST as (request: NextRequest) => Promise<Response>,
    getRequestedTracks: () => requestedTracks,
  };
}

test("post-close fallback scoped to one failed lane does not mark the already-live lane as failed", async () => {
  const route = loadRoute();
  const request = new NextRequest(new Request("https://khora.example.test/api/transcribir/dialogo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "d3f2357e-2364-44cf-973f-f7f2b24643ab",
      fuentes: ["microphone"],
    }),
  }));
  const response = await route.POST(request);
  assert.equal(response.status, 200);
  const data = await response.json() as any;
  assert.equal(route.getRequestedTracks().length, 1);
  assert.equal(route.getRequestedTracks()[0].fuente, "microphone");
  assert.equal(data.exito, true);
  assert.deepEqual(data.fuentesFallidas, []);
  assert.equal(data.estadoTranscripcion, "completo");
});

test("dialogue reconstruction route no longer exports individual microphone or Chrome files", () => {
  const source = readFileSync("app/api/transcribir/dialogo/route.ts", "utf8");
  assert.doesNotMatch(source, /export\s+async\s+function\s+GET/);
});
