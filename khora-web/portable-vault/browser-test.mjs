/** LOCAL browser fixture only. OIDC subject, clock and Ente secret are synthetic. */
import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=process.env.KHORA_QA_ROOT||fileURLToPath(new URL('../',import.meta.url));
const qaRequire=createRequire(root+'/package.json');
const {build}=qaRequire('esbuild');
const {chromium}=qaRequire('playwright');
import {PGlite} from '@electric-sql/pglite';
const {generate}=createRequire(import.meta.url)('otplib');
import {PGliteStore,VaultService} from './core.mjs';
import {createHandler} from './http.mjs';
import {createOpeningHandler} from './bridge.mjs';
import {openOnline} from './native-open.mjs';
const temp=await mkdtemp(tmpdir()+'/khora-browser-');const out=temp+'/app.js';
await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Controls from '${root}/app/sistema/seguridad/boveda-portable/controls.tsx';const q=new URLSearchParams(location.search);const opening=q.has('challenge')?Object.fromEntries(q):undefined;createRoot(document.getElementById('app')).render(<Controls opening={opening}/>);`,resolveDir:root,loader:'tsx'},outfile:out,bundle:true,platform:'browser',format:'iife',jsx:'automatic',alias:{react:root+'/node_modules/react','react-dom':root+'/node_modules/react-dom'}});
if(!process.env.KHORA_QA_CHROMIUM)throw Error('browser_preflight_required');
const db=new PGlite();const store=new PGliteStore(db);await store.initialize();let clock=Date.now(),enabled=false;const p={subject:'synthetic-ui-owner',binding:'synthetic-verified-session-UI-0001'},origin='https://khora.invalid';const service=new VaultService(store,randomBytes(32),{clock:()=>clock});
const handler=()=>createHandler({service,authenticate:async()=>p,origin,enabled});const native=createOpeningHandler({service,origin,enabled:true});let browser,server,port;const checks=[];const ok=(n,c)=>{assert.ok(c,n);checks.push(n);};
try{
 server=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/seguridad/boveda-portable')){const chunks=[];for await(const b of req)chunks.push(b);const r=await handler()(new Request(origin+'/api/seguridad/boveda-portable',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:Buffer.concat(chunks)}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(out));return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="es"><meta charset="utf-8"><title>LOCAL SYNTHETIC FIXTURE</title><main id="app"></main><script src="/app.js"></script></html>');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;const base=`http://127.0.0.1:${port}`;
 browser=await chromium.launch({executablePath:process.env.KHORA_QA_CHROMIUM,headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('status').filter({hasText:'no está activada'}).waitFor();ok('closed_service_keeps_enrollment_disabled',await page.getByRole('button',{name:'Registrar Ente Auth',exact:true}).isDisabled());ok('closed_service_does_not_offer_download',await page.locator('a[href$="/cliente"]').count()===0);
 enabled=true;await page.reload();await page.getByRole('button',{name:'Registrar Ente Auth',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('button').disabled);
 const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/seguridad/boveda-portable')&&r.status()===201);await page.getByRole('button',{name:'Registrar Ente Auth',exact:true}).click();const enrollment=await (await response).json();const secret=new URL(enrollment.uri).searchParams.get('secret');
 const otp=()=>generate({secret,epoch:Math.floor(clock/1000),algorithm:'sha1',period:30,digits:6});
 ok('enrollment_secret_masked_by_default',await page.getByLabel('Clave privada de configuración').getAttribute('type')==='password');await page.getByLabel('Código de Ente Auth').fill(await otp());await page.getByRole('button',{name:'Confirmar Ente Auth',exact:true}).click();await page.getByRole('status').filter({hasText:'Ente Auth confirmado'}).waitFor();ok('setup_secret_removed_after_confirmation',await page.getByLabel('Clave privada de configuración').count()===0);ok('download_control_points_to_authenticated_route',await page.locator('a[href="/api/seguridad/boveda-portable/cliente"]').count()===1);clock+=61000;
 let visits=0;
 const exchange=async(_o,b)=>{const r=await native(new Request(origin+'/api/oauth/portable-vault/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));assert.equal(r.status,200);return r.json();};
 async function launch(raw){visits++;const u=new URL(raw);await page.goto(base+'/?'+u.searchParams);await page.getByLabel('Código de Ente Auth').fill(await otp());await page.getByRole('button',{name:'Autorizar esta apertura',exact:true}).click();await page.waitForURL(/\/callback\?/);await page.getByText('Apertura autorizada.',{exact:false}).waitFor();}
 const first=await openOnline({origin,id:enrollment.id,launch,exchange,timeoutMs:15000});ok('browser_form_to_native_loopback_and_atomic_release',first.id===enrollment.id);clock+=61000;
 const second=await openOnline({origin,id:enrollment.id,launch,exchange,timeoutMs:15000});ok('second_native_opening_revisits_form_and_new_code',second.id===first.id&&visits===2);ok('no_browser_runtime_errors',errors.length===0);
 const evidence={scope:'LOCAL_CHROMIUM_SYNTHETIC_IDENTITY_ONLY',result:'PASSED',passed:checks.length,checks,browser:'Chromium sandbox-local',realKhoraOIDC:false,realEnteApp:false,realHostedPostgres:false,realWindows:false,realCorpus:false};await writeFile(new URL('./browser-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({result:'PASSED_LOCAL_BROWSER_FIXTURE',passed:checks.length}));await page.close();
}finally{await browser?.close();server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));await db.close();await rm(temp,{recursive:true,force:true});}
