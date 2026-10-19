/** Actual Ingreso editorial consumer + React, Chromium, IndexedDB and WebCrypto.
 * Synthetic transcript, receipt, owner and HTTP API; NOT microphone/Next/auth/DB/provider proof.
 * Run from khora-web: node tests/browser/blog-ingreso-receipt.local.test.mjs
 */
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'blog-ingreso-receipt-'));
const output=process.env.BLOG_BROWSER_EVIDENCE||path.join(temp,'evidence');await mkdir(output,{recursive:true});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=t=>createHash('sha256').update(t).digest('hex');
const source='No sé si fue ayer. Lo viví con calma. <script>window.unsafe=1</script>\n\nQuizá continúe mañana.';
const pub='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333',sourceId='11111111-1111-4111-8111-111111111111';
const entry=path.join(temp,'entry.tsx');
await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{PublicacionCapturaPendiente}from${JSON.stringify(path.join(root,'app/components/ingreso/PublicacionCapturaPendiente.tsx'))};import{guardarIntencionEditorialLocal,recuperarIntencionesEditorialesLocal}from${JSON.stringify(path.join(root,'lib/client/custodia-local.ts'))};window.readLocal=()=>recuperarIntencionesEditorialesLocal('synthetic-owner');window.seed=async(row)=>{await guardarIntencionEditorialLocal('synthetic-owner',row);createRoot(document.getElementById('root')!).render(<PublicacionCapturaPendiente owner="synthetic-owner"/>);};`);
const built=await build({entryPoints:[entry],absWorkingDir:root,bundle:true,write:false,jsx:'automatic',platform:'browser',nodePaths:[path.resolve(root,'node_modules'),path.dirname(path.dirname(require.resolve('react/package.json')))],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'style-not-under-test',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}));}}]});
const js=built.outputFiles[0].text,calls=[],errors=[],checks=[];let mode='normal',current=null,consent='pending',browser,server;
const check=(ok,label)=>{assert(ok,label);checks.push(label);};
function status(){return {revision:current?.revision??1,consent,filter:'publication_pending',deliveries:[]};}
server=createServer(async(req,res)=>{try{
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
 if(req.method==='GET'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');return;}
 let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw);calls.push({url:req.url,body});assert.equal(req.url,'/api/blog/editorial');let result;
 if(body.action==='open_turn'){if(mode==='normative'){res.statusCode=503;result={code:'NORMATIVE_TURN_UNAVAILABLE'};}else result={turn:{turn_token:'SYNTHETIC-NO-SECRET'}};}
 else if(body.action==='prepare'){current=body.revision;result={publicationId:current.publicationId,revision:current.revision,digest:hash(canonical(current)),preview:current.entry,facebook:current.facebook,destinations:['blog','facebook']};if(mode==='mismatch')result.digest='f'.repeat(64);}
 else if(body.action==='decide'){assert.equal(body.digest,hash(canonical(current)));consent=body.decision?'approved':'declined';result=status();if(mode==='lost'){res.statusCode=503;result={code:'SYNTHETIC_LOST_ACK'};}}
 else if(body.action==='decline_archived'){assert.deepEqual(body.reference,{publicationId:pub,sourceId,sourceVersion:1,sourceHash:hash(source)});consent='declined';result=status();}
 else if(body.action==='status')result=status();else throw Error('unexpected action');
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(e){res.statusCode=500;res.end(JSON.stringify({code:'SYNTHETIC_UNEXPECTED_REQUEST'}));errors.push(e.message);}});
const row=()=>({sessionId:sid,intent:{publicationId:pub,decision:null,sourceTextSha256:hash(source),state:'awaiting_decision'},draft:{title:'Transcripción sintética',body:source,date:'2026-10-19T20:38:14.844Z',obfuscated:false},receipt:{volcado_id:sourceId,version:1,sha256:hash(source)}});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||execFileSync('sh',['-c','command -v chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
 async function scenario(r,which='normal'){mode=which;current=null;consent='pending';const context=await browser.newContext(),p=await context.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());await p.goto(origin);await p.waitForFunction(()=>typeof window.seed==='function');await p.evaluate(r=>window.seed(r),r);await p.getByRole('heading',{name:'¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?'}).waitFor();return {p,context};}
 const prepare=p=>p.getByRole('button',{name:'Preparar vista previa de ambos destinos',exact:true}).click();
 const yes=p=>p.getByRole('button',{name:'Sí, publicar en ambos',exact:true});
 async function localState(p,expected){for(let n=0;n<100;n++){if((await p.evaluate(()=>window.readLocal()))[0]?.intent.state===expected)return;await p.waitForTimeout(50);}throw Error('local_state_not_confirmed:'+expected);}
 let {p,context}=await scenario(row());
 check((await p.getByLabel('Texto del blog',{exact:true}).inputValue()).replace(/\s/g,'')===source.replace(/\s/g,''),'existing transcript prefilled without paste');
 check(await p.locator('audio,input[type=file]').count()===0,'no audio/public file input');check(await yes(p).isDisabled(),'consent disabled before verified preview');
 await prepare(p);await p.getByRole('region',{name:'Vista previa verificada'}).waitFor();
 const sent=calls.filter(c=>c.body.action==='prepare').at(-1).body.revision;
 check(sent.sourceId===sourceId&&sent.sourceVersion===1&&sent.sourceHash===hash(source),'exact original receipt forwarded');
 check(sent.entry.body.replace(/\s/g,'')===source.replace(/\s/g,''),'public transcript literal order preserved');
 check(!await p.evaluate(()=>window.unsafe),'transcript markup escaped');
 check(!calls.some(c=>c.body.action==='decide'),'no implicit consent');
 await yes(p).click();await p.getByText('Autorización solicitada.',{exact:false}).waitFor();
 check(!await p.getByText('Publicación confirmada en ambos destinos.',{exact:true}).count(),'approved synthetic state not declared delivered');
 const n=calls.filter(c=>c.body.action==='decide').length;await p.getByRole('button',{name:'Comprobar estado sin reenviar publicaciones'}).click();
 await p.waitForTimeout(100);check(calls.filter(c=>c.body.action==='decide').length===n,'status never resends consent');
 check((await p.evaluate(()=>window.readLocal()))[0].intent.decision===true,'decision stored in actual IndexedDB');await context.close();
 ({p,context}=await scenario(row(),'normative'));await Promise.all([p.waitForResponse(r=>r.request().method()==='POST'&&r.request().postDataJSON()?.action==='decline_archived'),p.getByRole('button',{name:'No, conservar sin publicar',exact:true}).click()]);await localState(p,'received');
 check(calls.some(c=>c.body.action==='decline_archived'),'No independent of positive normative service');check(consent==='declined','negative receipt confirmed');await context.close();
 const missing=row();delete missing.receipt;({p,context}=await scenario(missing));const before=calls.length;await p.waitForTimeout(100);check(await p.getByRole('button',{name:'Preparar vista previa de ambos destinos',exact:true}).count()===0&&calls.length===before&&await yes(p).isDisabled(),'no receipt means no prepare or consent network');await context.close();
 ({p,context}=await scenario(row(),'mismatch'));await prepare(p);await p.getByRole('alert').waitFor();check(await yes(p).isDisabled(),'mismatched exact digest blocks approval');await context.close();
 ({p,context}=await scenario(row(),'normative'));await prepare(p);await p.getByRole('alert').waitFor();check(await yes(p).isDisabled(),'unavailable normative turn blocks positive path');await context.close();
 ({p,context}=await scenario(row(),'lost'));await prepare(p);await p.getByRole('region',{name:'Vista previa verificada'}).waitFor();const approvalsBefore=calls.filter(c=>c.body.action==='decide').length;await yes(p).click();await p.getByRole('alert').waitFor();
 check((await p.evaluate(()=>window.readLocal()))[0].intent.state==='awaiting_editorial_receipt','lost acknowledgement leaves durable pending reconciliation');
 await p.getByRole('button',{name:'Comprobar estado sin reenviar publicaciones'}).click();await localState(p,'received');
 check(calls.filter(c=>c.body.action==='decide').length===approvalsBefore+1,'lost acknowledgement reconciled without duplicate decision');await context.close();
 const opaque=row();opaque.draft.obfuscated=true;({p,context}=await scenario(opaque));await prepare(p);await p.getByRole('region',{name:'Vista previa verificada'}).waitFor();check(await yes(p).isDisabled(),'ofuscada requires explicit exact exposure');await context.close();
 check(calls.every(c=>c.url==='/api/blog/editorial'),'consumer never rearchives or calls dispatch');check(!errors.length,'zero runtime/server fixture errors');
 await writeFile(path.join(output,'browser-report.json'),JSON.stringify({scope:'actual consumer + React/Chromium/IndexedDB/WebCrypto; synthetic source/receipt/HTTP; no production',checks:checks.length,passed:checks,apiRequests:calls.length,errors},null,2));console.log(JSON.stringify({checks:checks.length,output,scope:'consumer browser synthetic HTTP; no production'}));
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
