import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioVaultLockedError, exportAudioAsMp3 } from "../../lib/client/export-audio-mp3";

test("export: manifest 423 becomes typed vault lock before audio read", async () => {
  const original = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = (async url => { calls.push(String(url)); return new Response(JSON.stringify({ detail: "locked" }), { status: 423 }); }) as typeof fetch;
  try { await assert.rejects(exportAudioAsMp3({ sourceUrl: "/audio", manifestUrl: "/manifest" }), AudioVaultLockedError); assert.deepEqual(calls, ["/manifest"]); }
  finally { globalThis.fetch = original; }
});
test("export: audio expiry also becomes typed vault lock", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async url => String(url) === "/manifest" ? Response.json({ audio_status: "disponible", custodia: { ok: true }, bytes_totales: 100 }) : new Response("", { status: 423 })) as typeof fetch;
  try { await assert.rejects(exportAudioAsMp3({ sourceUrl: "/audio", manifestUrl: "/manifest" }), AudioVaultLockedError); }
  finally { globalThis.fetch = original; }
});
test("export: unverified audio remains blocked", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ audio_status: "disponible", custodia: { ok: false } })) as typeof fetch;
  try { await assert.rejects(exportAudioAsMp3({ sourceUrl: "/audio", manifestUrl: "/manifest" }), /no está verificado/); }
  finally { globalThis.fetch = original; }
});


import { downloadCustodiaMp3 } from '../../lib/client/export-audio-mp3';
test('preserved MP3: lock uses the same typed prompt', async () => {
  const original=globalThis.fetch;globalThis.fetch=(async()=>new Response('',{status:423})) as typeof fetch;
  try{await assert.rejects(downloadCustodiaMp3({id:'a',filename:'a.mp3'}),AudioVaultLockedError);}finally{globalThis.fetch=original;}
});
test('preserved MP3: 409 requests work but never pretends download completed', async () => {
  const original=globalThis.fetch;let calls=0;globalThis.fetch=(async()=>++calls===1?new Response('',{status:409}):Response.json({estado:'solicitado'},{status:202})) as typeof fetch;
  try{assert.deepEqual(await downloadCustodiaMp3({id:'a',filename:'a.mp3'}),{status:'queued'});assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
test('preserved MP3: missing custody headers block download', async () => {
  const original=globalThis.fetch;globalThis.fetch=(async()=>new Response('bytes',{headers:{'content-type':'audio/mpeg'}})) as typeof fetch;
  try{await assert.rejects(downloadCustodiaMp3({id:'a',filename:'a.mp3'}),/metadatos de custodia/);}finally{globalThis.fetch=original;}
});
