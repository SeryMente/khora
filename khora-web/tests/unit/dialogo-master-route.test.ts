import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";

function loadRoute() {
  let user: { email: string } | null = { email: "master-owner@example.invalid" };
  let custodyFails = false;
  const master = Buffer.alloc(48);
  master.write("RIFF", 0, "ascii");
  master.writeUInt32LE(40, 4);
  master.write("WAVE", 8, "ascii");
  master.write("fmt ", 12, "ascii");
  master.writeUInt32LE(16, 16);
  master.writeUInt16LE(1, 20);
  master.writeUInt16LE(2, 22);
  master.writeUInt32LE(16000, 24);
  master.writeUInt32LE(64000, 28);
  master.writeUInt16LE(4, 32);
  master.writeUInt16LE(16, 34);
  master.write("data", 36, "ascii");
  master.writeUInt32LE(4, 40);
  const calls: unknown[][] = [];
  const actual = createRequire(import.meta.url);
  const source = readFileSync("app/api/transcribir/dialogo/master/route.ts", "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as Record<string, any> };
  const requireMock = (name: string) => {
    if (name === "next/server" || name === "next/server.js") return { NextRequest, NextResponse };
    if (name === "node:crypto") return actual(name);
    if (name === "@/auth") return { auth: async () => user ? { user } : null };
    if (name === "@/lib/server/audio-dialogo") return {
      cargarAudioDialogo: async (...args: unknown[]) => {
        calls.push(args);
        if (custodyFails) throw new Error("original_not_verified");
        return { pistas: [
          { fuente: "microphone", bytes: Buffer.from("original-user"), offsetMs: 0 },
          { fuente: "chrome_tab", bytes: Buffer.from("original-chrome"), offsetMs: 250 },
        ] };
      },
    };
    if (name === "@/lib/server/dialogo-master") return {
      generarMasterWavDialogo: async (tracks: unknown[]) => { calls.push(tracks); return master; },
    };
    return actual(name);
  };
  new Function("require", "module", "exports", js)(requireMock, module, module.exports);
  return {
    GET: module.exports.GET as (request: NextRequest) => Promise<Response>,
    calls,
    master,
    setUser: (value: { email: string } | null) => { user = value; },
    failCustody: () => { custodyFails = true; },
  };
}

const sessionId = "d3f2357e-2364-44cf-973f-f7f2b24643ab";
const request = (id = sessionId) =>
  new NextRequest("https://khora.example.test/api/transcribir/dialogo/master?sessionId=" + id);

test("master route authenticates before loading the owner's original audio", async () => {
  const route = loadRoute();
  route.setUser(null);
  assert.equal((await route.GET(request())).status, 401);
  route.setUser({ email: "master-owner@example.invalid" });
  assert.equal((await route.GET(request("invalid"))).status, 400);
  assert.equal(route.calls.length, 0);
});

test("master route downloads one SHA-verified stereo WAV from the two original tracks", async () => {
  const route = loadRoute();
  const response = await route.GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  assert.equal(response.headers.get("X-Audio-Channels"), "2");
  assert.equal(response.headers.get("X-Audio-Channel-Map"), "left=USUARIO;right=CHROME");
  assert.match(response.headers.get("Content-Disposition") || "", /dialogo-.*\.wav/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, route.master);
  assert.equal(response.headers.get("X-Audio-SHA256"), createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(route.calls[0], [sessionId, "master-owner@example.invalid"]);
  assert.deepEqual(route.calls[1], [
    { fuente: "microphone", bytes: Buffer.from("original-user"), offsetMs: 0 },
    { fuente: "chrome_tab", bytes: Buffer.from("original-chrome"), offsetMs: 250 },
  ]);
});

test("master route fails closed if original Custody hashes cannot be verified", async () => {
  const route = loadRoute();
  route.failCustody();
  const response = await route.GET(request());
  assert.equal(response.status, 409);
  assert.match((await response.json() as { detail: string }).detail, /originales_siguen_custodiados/);
});
