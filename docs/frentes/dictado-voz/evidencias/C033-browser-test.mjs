import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);
const {build}=require('esbuild'),{chromium}=require('playwright');
import fs from 'node:fs';
const root=process.env.KHORA_C033_ROOT||process.cwd();
await build({stdin:{contents:`export * from '${root}/lib/client/archivar-recuperada.ts'; export * from '${root}/lib/client/custodia-local.ts'; export * from '${root}/lib/custodia/archivo-recuperado.ts'; export * from '${root}/lib/custodia/estado.ts';`,resolveDir:'/data',sourcefile:'c033-test-entry.ts'},bundle:true,platform:'browser',format:'iife',globalName:'custodiaTest',outfile:'/data/c033-browser-bundle.js'});
const browser=await chromium.launch({executablePath:'/usr/local/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.route('http://localhost:37991/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Custodia local test</title>'}));await page.goto('http://localhost:37991/');await page.addScriptTag({path:'/data/c033-browser-bundle.js'});
 const result=await page.evaluate(async()=>{
  const m=globalThis.custodiaTest,assert=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg)},checks=[];
  const owner='synthetic-owner@example.invalid',sessionId='11111111-1111-4111-8111-111111111111',revisionId='22222222-2222-4222-8222-222222222222';
  const blob=new Blob(['synthetic-byte-capture-not-real-audio'],{type:'audio/webm'}),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
  const part={parte:1,url:'https://example.invalid/private.webm',bytes:blob.size,sha256:sha,verificado:true,fuenteAudio:'microphone',start_ms:0,end_ms:5000,duracion_ms:5000};
  const selected={sessionId,revisionId,clientAt:1,texto:'Texto elegido',parcial:'continuación elegida',titulo:'Título elegido',fuenteEntrada:'microfono',tipoEntrada:'general',ofuscada:true,duracionSeg:5,audioPartes:[part],audioPartesEsperadas:1,corteAudio:{hastaParte:1,finMs:5000}};
  const later={...selected,revisionId:'33333333-3333-4333-8333-333333333333',clientAt:2,texto:'Texto posterior',titulo:'Título posterior',audioPartesEsperadas:2,corteAudio:{hastaParte:2,finMs:10000},audioPartes:[part,{...part,parte:2}]};
  await m.guardarSnapshotLocal(owner,selected,true);await m.guardarSnapshotLocal(owner,later);await m.guardarAudioLocal(owner,sessionId,1,blob,{upload:{fuenteAudio:'microphone',startMs:0,endMs:5000,duracionMs:5000}});await m.guardarAudioLocal(owner,sessionId,2,blob,{upload:{fuenteAudio:'microphone',startMs:5000,endMs:10000,duracionMs:5000}});
  const requests=[],snapshots=new Map([[revisionId,selected]]),children=new Map(),archives=new Map();let forged=false,missing=false;
  const realFetch=fetch;
  globalThis.fetch=async(url,options={})=>{
   const path=String(url),payload=options.body&&!(options.body instanceof FormData)?JSON.parse(options.body):undefined;requests.push({path,body:payload});
   if(path==='/api/audio')return Response.json({sessionId,partIndex:1,url:part.url,sha256:sha,bytes:blob.size,verificado:true,fuenteAudio:'microphone'});
   if(path.startsWith('/api/dictado/checkpoint?sessionId='))return Response.json({owner,recovery:missing?{...selected,audioPartesEsperadas:2,corteAudio:undefined}:selected});
   if(path==='/api/dictado/checkpoint'){snapshots.set(payload.revisionId,payload);return Response.json({sessionId:payload.sessionId,revisionId:payload.revisionId});}
   if(path==='/api/dictado/checkpoint?recover=1'){
    const source=snapshots.get(payload.revisionId);if(!source)throw Error('source not persisted');
    const child=children.get(payload.sessionId)||{...source,sessionId:payload.sessionId,revisionId:crypto.randomUUID(),recuperadaDe:{sessionId:source.sessionId,revisionId:source.revisionId}};children.set(payload.sessionId,child);
    return Response.json({owner,recovery:forged?{...child,texto:'Punto incorrecto'}:child});
   }
   if(path==='/api/dictado'){
    if(payload.sessionId===sessionId)throw Error('must never seal parent');
    const text=payload.texto,hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
    const receipt=archives.get(payload.sessionId)||{id:'44444444-4444-4444-8444-444444444444',sessionId:payload.sessionId,version:1,sha256:hash,tipoEntrada:payload.tipoEntrada,ofuscada:payload.ofuscada};archives.set(payload.sessionId,receipt);return Response.json(receipt);
   }throw Error('unexpected endpoint '+path);
  };
  try{
   const before=JSON.stringify(later);await m.archivarRecuperada(owner,{sessionId,revisionId,local:false});
   const payload=requests.find(x=>x.path==='/api/dictado').body;
   assert(payload.texto==='Texto elegido\n\ncontinuación elegida','archive uses exact selected text and partial');assert(payload.titulo==='Título elegido'&&payload.ofuscada===true,'title and obfuscated classification retained');assert(payload.audioPartes.length===1,'later audio is not added to earlier selection');
   assert(payload.sessionId!==sessionId,'only separate child is archived');assert(JSON.stringify(later)===before,'active/later input object unchanged');
   let local=await m.recuperarLocal(owner);assert(local.snapshots.some(x=>x.sessionId===sessionId&&x.texto==='Texto posterior'),'later checkpoint remains recoverable');assert(local.audios.length===2,'both local originals survive ACK and archive');assert(!local.snapshots.some(x=>x.sessionId===payload.sessionId),'archived child hidden from recoverables');
   await m.archivarRecuperada(owner,{sessionId,revisionId,local:false});assert(archives.size===1,'same selection retry creates no second archive');
   const n=requests.filter(x=>x.path==='/api/dictado').length;forged=true;let failed=false;try{await m.archivarRecuperada(owner,{sessionId,revisionId,local:false});}catch{failed=true;}assert(failed&&requests.filter(x=>x.path==='/api/dictado').length===n,'wrong fork content blocks archive');forged=false;
   missing=true;failed=false;try{await m.archivarRecuperada(owner,{sessionId,revisionId,local:false});}catch{failed=true;}assert(failed&&requests.filter(x=>x.path==='/api/dictado').length===n,'missing tail is rejected before archive');missing=false;
   await m.archivarRecuperada(owner,{sessionId,revisionId,local:true});await m.archivarRecuperada(owner,{sessionId,revisionId,local:true});
   local=await m.recuperarLocal(owner);assert(archives.size===1,'local and remote selection share the stable archive id');assert(local.snapshots.some(x=>x.sessionId===sessionId&&x.texto==='Texto posterior'),'local earlier archive keeps later snapshot');assert(local.audios.length===2,'local archive retains original encrypted audio');
   assert(!requests.some(x=>x.path.includes('/blog')||x.path.includes('facebook')),'archive does not publish anywhere');
   return {checks,requests:requests.map(x=>({path:x.path,sessionId:x.body?.sessionId})),limits:['synthetic bytes, not microphone/Chrome audio','real browser IndexedDB+WebCrypto; HTTP endpoints are fixtures','no production DB, auth, deploy or human UI acceptance']};
  }finally{globalThis.fetch=realFetch;}
 });
 fs.writeFileSync('/data/c033-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.checks.length,checks:result.checks},null,2));await page.close();
}finally{await browser.close();}
