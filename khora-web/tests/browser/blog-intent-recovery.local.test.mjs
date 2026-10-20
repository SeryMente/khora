/** LOCAL real React + IndexedDB/AES-GCM + Chromium; synthetic owner/normative HTTP.
 * Not a Next build, real authentication/database/provider or publication evidence.
 * From khora-web: node tests/browser/blog-intent-recovery.local.test.mjs
 * Optional NODE_PATH/CHROMIUM_PATH/BLOG_BROWSER_EVIDENCE; no credentials required. */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{build}=require('esbuild'),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../../',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'khora-blog-recovery-'));
const evidence=process.env.BLOG_BROWSER_EVIDENCE||path.join(temp,'evidence');await mkdir(evidence,{recursive:true});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
const entry=path.join(temp,'entry.tsx');
await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{PublicacionCapturaPendiente}from ${JSON.stringify(path.join(root,'app/components/ingreso/PublicacionCapturaPendiente.tsx'))};import{guardarIntencionEditorialLocal,recuperarIntencionesEditorialesLocal}from ${JSON.stringify(path.join(root,'lib/client/custodia-local.ts'))};const root=createRoot(document.getElementById('root')!);Object.assign(window,{seed:guardarIntencionEditorialLocal,records:recuperarIntencionesEditorialesLocal,boot:(owner:string)=>root.render(<PublicacionCapturaPendiente key={owner} owner={owner}/>) });`);
const bundle=await build({entryPoints:[entry],absWorkingDir:root,bundle:true,write:false,jsx:'automatic',platform:'browser',nodePaths:[path.join(root,'node_modules'),...(process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean)],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-style-stub',setup(b){b.onResolve({filter:/\.module\.css$/},args=>({path:args.path,namespace:'styles'}));b.onLoad({filter:/.*/,namespace:'styles'},()=>({contents:'export default new Proxy({}, {get:(_,name)=>String(name)})',loader:'js'}));}}]});
const calls=[],rows=new Map(),refusals=new Map(),checks=[];let flags={},browser,server,page;
const check=(condition,name)=>{assert(condition,name);checks.push(name);};
const status=row=>({revision:row.r.revision,consent:row.consent,filter:row.consent==='approved'?'publication_pending':row.consent==='declined'?'archived_without_permission':'awaiting_decision',deliveries:row.deliveries||[]});
server=createServer(async(req,res)=>{const reply=(data,code=200)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};try{
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 if(req.method==='GET'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');return;}
 let raw='';for await(const part of req)raw+=part;const b=JSON.parse(raw);calls.push(b);
 if(b.action==='open_turn'){if(flags.failNorm)return reply({code:'NORMATIVE_TURN_UNAVAILABLE'},503);return reply({turn:{turn_token:'SYNTHETIC_TOKEN_NOT_FOR_STORAGE'}});}
 if(b.action==='elaborate')return reply({proposal:{method:'cronica-sobria-v1',sourceHash:b.reference.sourceHash,requiresReview:true,body:flags.longProposal?'x'.repeat(70000):'Crónica trabajada sintética. Quizá vuelva; no afirmé una fecha. 🙂'}});
 if(b.action==='prepare'){
  const r=b.revision,old=rows.get(r.publicationId);
  if(old&&canonical(old.r)!==canonical(r)&&(b.expectedRevision!==old.r.revision||r.revision!==old.r.revision+1))return reply({code:'EDITORIAL_CONFLICT'},409);
  if(!old&&(b.expectedRevision!==null||r.revision!==1))return reply({code:'EDITORIAL_CONFLICT'},409);
  if(!old||canonical(old.r)!==canonical(r))rows.set(r.publicationId,{r,consent:'pending'});
  return reply({publicationId:r.publicationId,revision:r.revision,digest:hash(canonical(r)),preview:r.entry,facebook:r.facebook,destinations:['blog','facebook']});
 }
 if(b.action==='decline_archived'){
  if(flags.failDecline){flags.failDecline=false;return reply({code:'REFUSAL_NOT_RECORDED'},503);}
  const d={consent:'declined',filter:'archived_without_permission',deliveries:[]};refusals.set(b.reference.publicationId,d);return reply(d);
 }
 if(b.action==='status'&&refusals.has(b.publicationId))return reply(refusals.get(b.publicationId));
 if(b.action==='status'&&!b._norm_turn_token)return reply({code:'NORMATIVE_TURN_REQUIRED'},409);
 const row=rows.get(b.publicationId);if(!row)return reply({code:'EDITORIAL_FORBIDDEN'},409);
 if(b.action==='resume')return reply({revision:row.r,digest:hash(canonical(row.r)),status:status(row)});
 if(b.action==='decide'){
  if(b.digest!==hash(canonical(row.r)))return reply({code:'APPROVAL_CONFLICT'},409);
  if(flags.failDecide==='before'){flags.failDecide='';return reply({code:'NORMATIVE_TURN_REQUIRED'},409);}
  row.consent='approved';
  if(flags.failDecide==='after'){flags.failDecide='';return reply({code:'EDITORIAL_OPERATION_FAILED'},503);}
  return reply(status(row));
 }
 if(b.action==='status')return reply(status(row));
 return reply({code:'ACTION_INVALID'},400);
 }catch(e){reply({code:'FIXTURE_ERROR'},500);}});
const original='ORIGINAL PRIVADO SINTÉTICO. El hecho ocurrió quizá otro día, no sé cuándo. <script>window.__unsafe=1</script>';
function makeRow({prepared=false,legacy=false,decision=null,obfuscated=false}={}){
 const publicationId=randomUUID(),sourceId=randomUUID(),sourceHash=hash(original),date='2026-10-20T00:13:00.000Z';
 const row={sessionId:randomUUID(),intent:{publicationId,sourceTextSha256:sourceHash,state:decision===null?'awaiting_decision':'awaiting_editorial_receipt',decision},receipt:{volcado_id:sourceId,version:2,sha256:sourceHash},draft:{title:'Título sintético',body:original,date,obfuscated}};
 if(prepared||legacy){row.request={publicationId,revision:1,sourceId,sourceVersion:2,sourceHash,kind:'blog_personal',obfuscated,entry:{schema:1,slug:'cronica-'+publicationId,title:'Título público exacto',date,body:'Crónica ya revisada, sintética.',source:{kind:'khora',sha256:hash('Crónica ya revisada, sintética.')}},facebook:{format:'link',message:'Mensaje exacto sintético.'}};row.prepared={digest:hash(canonical(row.request))};if(!legacy)row.elaboration={method:'cronica-sobria-v1',sourceHash,bodyHash:hash(row.request.entry.body),reviewed:true};}
 return row;
}
let owner;
async function load(row,{serverRow=true}={}){flags={};owner='owner-'+row.intent.publicationId;await page.goto(origin);await page.waitForFunction(()=>!!window.seed);await page.evaluate(async({owner,row})=>{await window.seed(owner,row);window.boot(owner);},{owner,row});if(row.request&&serverRow)rows.set(row.intent.publicationId,{r:structuredClone(row.request),consent:'pending'});await page.getByRole('heading',{name:'¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?'}).waitFor();}
const records=()=>page.evaluate(owner=>window.records(owner),owner);
const waitRecord=async(predicate)=>{for(let i=0;i<100;i++){const r=(await records())[0];if(predicate(r))return r;await page.waitForTimeout(20);}throw Error('local record did not reach expected checkpoint');};
const button=name=>page.getByRole('button',{name,exact:true});
const recover='Recuperar previa para reintentar mi autorización',retry='Sí, reintentar esta misma versión en ambos',newPreview='Crear una nueva previa sin heredar autorización',prepare='Preparar vista previa de ambos destinos';
let origin;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||execFileSync('sh',['-c','command -v chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 // Worked proposal: same original receipt, encrypted storage and reload, no consent.
 let row=makeRow();await load(row);await button('Elaborar crónica desde el original').click();let saved=await waitRecord(r=>!!r.proposal);
 check(saved.proposal.sourceHash===row.receipt.sha256&&saved.proposal.revision===1&&saved.proposal.owner===owner,'proposal binds source/revision/owner');
 check(saved.draft.body===original&&saved.intent.decision===null&&!saved.request,'worked proposal neither replaces original nor grants consent');
 check(!JSON.stringify(saved).includes('SYNTHETIC_TOKEN_NOT_FOR_STORAGE'),'normative token not persisted');
 const storage=await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('khora-custodia-v1',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const all=store=>new Promise((resolve,reject)=>{const q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const rows=await all('records'),keys=await all('keys');db.close();return {ciphertext:rows.every(r=>r.data instanceof ArrayBuffer&&!('proposal' in r)&&!('draft' in r)),nonextractable:keys.every(k=>k.extractable===false)};});
 check(storage.ciphertext&&storage.nonextractable,'real IndexedDB stores AES-GCM ciphertext with nonextractable key');
 check((await page.evaluate(()=>window.records('other-owner'))).length===0,'other owner cannot enumerate proposal');
 const worked=saved.proposal.body;await page.reload();await page.waitForFunction(()=>!!window.boot);await page.evaluate(owner=>window.boot(owner),owner);await page.getByLabel('Texto del blog',{exact:true}).waitFor();check(await page.getByLabel('Texto del blog',{exact:true}).inputValue()===worked,'worked proposal survives actual reload');
 await page.getByLabel('Texto del blog',{exact:true}).fill(worked+' Edición privada.');await waitRecord(r=>r.proposal.body.endsWith('Edición privada.'));
 check((await records())[0].proposal.reviewed===false,'editing invalidates reviewed marker');
 check((await page.locator('article').innerText()).includes('Momento del hecho: el que describes en el relato; si no lo precisaste, queda sin precisar.'),'event moment is not inferred from capture/archive');
 check((await page.locator('article').innerText()).includes('No acredita cuándo ocurrió el hecho ni cuándo comenzó el dictado.'),'record/archive time explicitly distinguished from event/capture');
 check(!await page.evaluate(()=>window.__unsafe),'original text is escaped, not executed');
 // Long proposal remains intact; do not truncate it to fit the independent Facebook field.
 row=makeRow();await load(row);flags.longProposal=true;await button('Elaborar crónica desde el original').click();saved=await waitRecord(r=>!!r.proposal);check(saved.proposal.body.length===70000&&saved.proposal.facebook.message==='', 'long worked proposal is saved intact without fabricated Facebook text');check(await button(prepare).isDisabled()&&saved.intent.decision===null,'long proposal still requires completed Facebook text and review');
 // Failed pre-commit approval: explicit re-preview then same digest retry only.
 row=makeRow({prepared:true});await load(row);await button('Recuperar la misma vista previa').click();await page.getByRole('region',{name:'Vista previa verificada'}).waitFor();flags.failDecide='before';await button('Sí, publicar en ambos').click();await page.getByRole('alert').waitFor();await waitRecord(r=>r.intent.decision===true);
 const before=calls.filter(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId).length;
 check(!(await page.locator('article').innerText()).includes('Autorización confirmada por el servidor'),'failed HTTP approval is not confirmed');
 await button(recover).click();await button(retry).waitFor();check(calls.filter(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId).length===before,'recovering exact preview does not autoapprove');
 await button(retry).click();await waitRecord(r=>r.intent.state==='received');const attempts=calls.filter(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId);
 check(attempts.length===2&&attempts.every(c=>c.digest===row.prepared.digest),'explicit retry sends identical publication id and digest');
 check(!(await page.locator('article').innerText()).includes('Publicación confirmada en ambos destinos.'),'server approval is not mistaken for destination receipts');
 // Lost approval response AFTER commit: reconcile instead of a second POST.
 row=makeRow({prepared:true});await load(row);await button('Recuperar la misma vista previa').click();await page.getByRole('region',{name:'Vista previa verificada'}).waitFor();flags.failDecide='after';await button('Sí, publicar en ambos').click();await page.getByRole('alert').waitFor();await button(recover).click();await waitRecord(r=>r.intent.state==='received');
 check(calls.filter(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId).length===1,'lost successful response reconciles without approval resend');
 // Normative preflight fails before any POST; later recovery never invents consent.
 row=makeRow({prepared:true,decision:true});await load(row);flags.failNorm=true;await button(recover).click();await page.getByRole('alert').waitFor();check(!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'open_turn failure sends no approval');flags.failNorm=false;await button(recover).click();await button(retry).waitFor();check(!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'restored preflight still requires a fresh explicit click');
 // Negative retry needs neither normative availability nor positive authorization.
 row=makeRow();await load(row);flags.failDecline=true;await button('No, conservar sin publicar').click();await page.getByRole('alert').waitFor();await button('Comprobar estado sin reenviar publicaciones').click();await page.getByRole('alert').waitFor();const normBefore=calls.filter(c=>c.action==='open_turn').length;await button('Reintentar guardar mi decisión de no publicar').click();await waitRecord(r=>r.intent.state==='received');
 check(calls.filter(c=>c.action==='open_turn').length===normBefore&&!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'negative retry remains independent of normative/positive approval');
 check((await records())[0].draft.body===original,'negative receipt preserves archived original reference');
 // Legacy request: same publication/source, new revision, no inherited review/consent.
 row=makeRow({legacy:true});await load(row);await button(newPreview).click();saved=await waitRecord(r=>r.revisionBase===1&&!r.request);check(saved.intent.decision===null&&!saved.prepared&&!saved.elaboration&&saved.proposal.reviewed===false,'legacy reset clears approval/preview and demands review');
 check(!await page.getByLabel('Texto del blog',{exact:true}).isDisabled()&&await button(prepare).isDisabled(),'legacy editor becomes usable but cannot skip review');
 await page.getByLabel('Texto del blog',{exact:true}).fill('Crónica vuelta a trabajar.');await page.getByLabel('He trabajado el texto público',{exact:false}).check();await button(prepare).click();await page.getByRole('region',{name:'Vista previa verificada'}).waitFor();saved=(await records())[0];
 const replacement=calls.filter(c=>c.action==='prepare'&&c.revision.publicationId===row.intent.publicationId).at(-1);
 check(replacement.revision.revision===2&&replacement.expectedRevision===1&&replacement.revision.sourceHash===row.receipt.sha256,'replacement uses server revision CAS with same original receipt');
 check(!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'new legacy preview grants no publication');
 check(saved.proposal.revision===2&&saved.proposal.bodyHash===hash(saved.request.entry.body),'new proposal bound to replacement revision/body');
 // Old prepare never reached server: idempotent old draft recovery then fresh preview.
 row=makeRow({legacy:true});await load(row,{serverRow:false});await button(newPreview).click();await waitRecord(r=>r.revisionBase===1&&!r.request);check(rows.get(row.intent.publicationId).consent==='pending'&&!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'legacy missing draft recovered without consent');
 // Unsafe delivery state, a changed revision and existing approval are never overwritten.
 for(const kind of ['unknown','cancelled','approved','changed']){row=makeRow({prepared:true,decision:true});await load(row);const sr=rows.get(row.intent.publicationId);if(kind==='unknown'||kind==='cancelled')sr.deliveries=[{revision:1,target:'blog',state:kind}];if(kind==='approved')sr.consent='approved';if(kind==='changed')sr.r.entry.body='DISTINTO';await button(recover).click();if(kind==='approved')await waitRecord(r=>r.intent.state==='received');else await page.getByRole('alert').waitFor();check(await button(retry).count()===0&&!calls.some(c=>c.action==='decide'&&c.publicationId===row.intent.publicationId),'no retry on '+kind);}
 // Obfuscated exposure must be renewed after exact recovery, never inherited locally.
 row=makeRow({prepared:true,decision:true,obfuscated:true});row.obfuscatedExposure=true;await load(row);await button(recover).click();await button(retry).waitFor();check(await button(retry).isDisabled(),'old obfuscated exposure does not authorize a retry');await page.getByLabel('He revisado este texto ofuscado',{exact:false}).check();check(await button(retry).isEnabled(),'fresh explicit exposure enables exact retry only');
 // Private storage failure must be visible; do not replace editor with unpersisted Groq result.
 row=makeRow();await load(row);await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.restorePut=()=>{IDBObjectStore.prototype.put=put;};IDBObjectStore.prototype.put=function(value,...args){if(this.name==='records'&&value.kind==='publication')throw new DOMException('synthetic quota','QuotaExceededError');return put.call(this,value,...args);};});await button('Elaborar crónica desde el original').click();await page.getByRole('alert').waitFor();check(!(await records())[0].proposal,'quota failure does not claim a saved proposal');check(!(await page.getByLabel('Texto del blog',{exact:true}).inputValue()).includes('Crónica trabajada sintética'),'failed persistence does not silently substitute original editor');
 await page.evaluate(()=>window.restorePut());await button('Elaborar crónica desde el original').click();await waitRecord(r=>!!r.proposal);check((await records())[0].proposal.body.includes('Crónica trabajada sintética'),'proposal persistence can recover after a storage failure');
 check(errors.length===0,'no uncaught browser errors');
 check(!calls.some(c=>JSON.stringify(c).includes('audioPartes')||JSON.stringify(c).includes('audioPublicUrl')),'no audio exported with editorial requests');
 check(calls.every(c=>['open_turn','elaborate','prepare','resume','status','decide','decline_archived'].includes(c.action)),'only synthetic editorial endpoints used, no provider/capture dispatch');
 await writeFile(path.join(evidence,'result.json'),JSON.stringify({checks:checks.length,passed:checks,scope:'Real React/IndexedDB/WebCrypto; synthetic auth/normative/API; no providers/Next build/publication'},null,2));console.log(JSON.stringify({passed:checks.length,failed:0,evidence}));
}catch(e){if(page)await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
