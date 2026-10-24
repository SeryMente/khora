/** Local-only real Chromium + IndexedDB + synthetic microphone custody test.
 * Run: node --import tsx tests/browser/custodia-local.mjs
 * No login, production API, Blob, PostgreSQL or physical microphone is exercised.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import ts from '/data/khora-dialogo-fix/tools/node_modules/typescript/lib/typescript.js';
import { chromium } from '/data/khora-ingreso-c031/test-tools/node_modules/playwright/index.mjs';
import { convertirAudioMp3, agruparPartesAudio } from './c045-audio.mjs';
const source = await fs.readFile(new URL('./c045-store.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url==='/store.js'?'text/javascript':'text/html');res.end(req.url==='/store.js'?js:'<!doctype html><title>Custodia local — aislada</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;let checks=0;
try {
 browser=await chromium.launch({executablePath:'/usr/local/bin/chromium',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const context=await browser.newContext({permissions:['microphone']});
 const page=await context.newPage();const url=`http://127.0.0.1:${server.address().port}`;
 await page.goto(url);
 const snapshot={sessionId:'11111111-1111-4111-8111-111111111111',revisionId:'22222222-2222-4222-8222-222222222222',clientAt:Date.now(),texto:'Texto manual único — áéíóú',parcial:'provisional',titulo:'Prueba sintética',fuenteEntrada:'texto',duracionSeg:0,audioPartes:[]};
 await page.evaluate(async s=>{const m=await import('/store.js');await m.guardarSnapshotLocal('owner-A',s);},snapshot);
 await page.reload();
 assert.deepEqual(await page.evaluate(async()=>{const m=await import('/store.js');return (await m.recuperarLocal('owner-A')).snapshots[0];}),snapshot);checks++;
 assert.equal(await page.evaluate(async()=>{const m=await import('/store.js');return (await m.recuperarLocal('owner-B')).snapshots.length;}),0);checks++;
 assert.equal(await page.evaluate(async text=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('khora-custodia-v1');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});try{return await new Promise((ok,no)=>{const r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>ok(JSON.stringify(r.result).includes(text));r.onerror=()=>no(r.error);});}finally{db.close();}},snapshot.texto),false);checks++;
 const second=await context.newPage();await second.goto(url);
 await Promise.all([page,second].map((p,i)=>p.evaluate(async i=>{const m=await import('/store.js');await m.guardarSnapshotLocal('racing-owner',{sessionId:'race-'+i,revisionId:'revision-'+i,clientAt:Date.now(),texto:'race-'+i,parcial:'',titulo:'',fuenteEntrada:'texto',duracionSeg:0,audioPartes:[]});},i)));
 assert.equal(await page.evaluate(async()=>{const m=await import('/store.js');return (await m.recuperarLocal('racing-owner')).snapshots.length;}),2);checks++;
 const captures=await page.evaluate(async()=>{
  const m=await import('/store.js'),recordings=[];
  for(let take=0;take<2;take++){
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream);const chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=reject;});
   recorder.start(1000);await new Promise(resolve=>setTimeout(resolve,3100));recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
   for(const chunk of chunks){const part=recordings.length+1;await m.guardarAudioLocal('owner-A','audio-session',part,chunk,{upload:{fuenteAudio:'microphone'}});recordings.push(Array.from(new Uint8Array(await chunk.arrayBuffer())));}
  }
  return recordings;
 });
 await page.reload();
 const recovered=await page.evaluate(async()=>{const m=await import('/store.js');const r=await m.recuperarLocal('owner-A');return Promise.all(r.audios.sort((a,b)=>a.part-b.part).map(async a=>Array.from(new Uint8Array(await a.blob.arrayBuffer()))));});
 assert.deepEqual(recovered,captures);checks++;
 const groups=agruparPartesAudio(captures.map(b=>Buffer.from(b)));assert.equal(groups.length,2);checks++;
 const mp3=await convertirAudioMp3(groups);assert.ok(mp3.duracionSeg>5.5 && mp3.duracionSeg<7);assert.ok(mp3.bytes.length>100);checks++;
 await page.evaluate(async()=>{const m=await import('/store.js');await m.confirmarAudioLocal('owner-A','audio-session',1);await m.cerrarSnapshotLocal('owner-A','11111111-1111-4111-8111-111111111111');});
 const remaining=await page.evaluate(async()=>{const m=await import('/store.js');const r=await m.recuperarLocal('owner-A');return {snapshots:r.snapshots.length,audios:r.audios.length};});
 assert.deepEqual(remaining,{snapshots:0,audios:captures.length-1});checks++;
 console.log(JSON.stringify({status:'PASS',checks,synthetic:true,realIndexedDB:true,recordings:groups.length,parts:captures.length,mp3Seconds:mp3.duracionSeg,productionServices:false}));
 await context.close();
} finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
