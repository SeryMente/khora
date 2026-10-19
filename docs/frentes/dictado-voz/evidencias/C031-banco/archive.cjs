const {build}=require('esbuild');const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const folder='repo';
(async()=>{
 const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{IngresoWorkspace}from'${root}/repo/khora-web/app/components/ingreso/IngresoWorkspace.tsx';createRoot(document.getElementById('root')).render(<IngresoWorkspace/>);`;
 await build({stdin:{contents:entry,loader:'tsx',resolveDir:'/data'},bundle:true,nodePaths:[path.dirname(path.dirname(require.resolve('react')))],outfile:root+'/tests/bundle.js',jsx:'automatic',loader:{'.css':'local-css'},plugins:[require('./normal-plugin.cjs')(root),{name:'icons',setup(b){b.onResolve({filter:/^lucide-react$/},()=>({path:'icons',namespace:'icons'}));b.onLoad({filter:/.*/,namespace:'icons'},()=>({contents:`import React from 'react';${['History','Mic','Square','Monitor','Paperclip','Ellipsis','Sparkles','RefreshCw','Download','CircleAlert','Info','Check','PencilLine','ShieldCheck','Save','Trash2','ArrowRight','X','LoaderCircle','ChevronDown','Activity','Volume2','Archive','Plus'].map(x=>`export const ${x}=()=>React.createElement('svg',{'aria-hidden':true});`).join('')}`,resolveDir:'/data'}));}}]});
 const server=http.createServer((req,res)=>{const p=req.url.split('?')[0];res.setHeader('content-type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(p.endsWith('.js')?fs.readFileSync(root+'/tests/bundle.js'):p.endsWith('.css')?fs.readFileSync(root+'/tests/bundle.css'):'<html><head><link rel="stylesheet" href="/bundle.css"><style>:root{--khora-ink:#222;--khora-bg:white;--khora-accent:#579}body{font-family:Arial}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:require('child_process').execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const results=[];let snapshots=new Map();
 async function run(bad=false,decline=false){
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const posts=[];let archivePayload;let normativeFail=true,preparedRequest,approved=false,both=false,decisions=0;
 await page.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());let d={};if(req.method()==='POST')posts.push({path:u.pathname,body:req.postData()});
 if(u.pathname==='/api/dictado/checkpoint'){if(req.method()==='POST')d=JSON.parse(req.postData());else if(u.searchParams.has('bootstrap'))d={owner:'test-owner'};else d={items:[]};}
 else if(u.pathname==='/api/dictado'){archivePayload=JSON.parse(req.postData());const hash=await page.evaluate(async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join(''),archivePayload.texto);d={id:'2c294d17-a175-415e-b5f5-df0245fa7d4a',sessionId:archivePayload.sessionId,sha256:bad?'a'.repeat(64):hash,version:1,tipoEntrada:archivePayload.tipoEntrada,ofuscada:archivePayload.ofuscada,chars:archivePayload.texto.length};}
 else if(u.pathname==='/api/blog/editorial'){
 const b=JSON.parse(req.postData());
 if(b.action==='open_turn'){if(normativeFail)return route.fulfill({status:503,json:{code:'NORMATIVE_TURN_UNAVAILABLE'}});d={turn:{turn_token:'fixture-only-not-a-real-token'}};}
 else if(b.action==='prepare'){preparedRequest=b.revision;const digest=await page.evaluate(async x=>{const c=v=>Array.isArray(v)?'['+v.map(c).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+c(v[k])).join(',')+'}':JSON.stringify(v);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(c(x)))),b=>b.toString(16).padStart(2,'0')).join('');},b.revision);d={publicationId:b.revision.publicationId,revision:1,digest,preview:b.revision.entry,facebook:b.revision.facebook,destinations:['blog','facebook']};}
 else if(b.action==='decide'){approved=b.decision;decisions++;return route.abort('failed');}
 else if(b.action==='decline_archived'){d={consent:'declined',filter:'archived_without_permission',ofuscada:true};}
 else if(b.action==='status'){d={revision:1,consent:approved?'approved':'pending',filter:both?'published_both':'publication_pending',deliveries:[{revision:1,target:'blog',state:'confirmed',url:'https://example.invalid/blog',proof_hash:'b'.repeat(64)},{revision:1,target:'facebook',state:both?'confirmed':'pending',url:both?'https://example.invalid/facebook':null,proof_hash:both?'c'.repeat(64):null}]};}
 }
 else if(u.pathname==='/api/eventos')d={summary:{accepted:0,duplicates:0,rejected:0}};
 await route.fulfill({status:200,json:d});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/sistema/ingreso');await page.waitForFunction(()=>!document.querySelector('[data-ui-id="ingreso.btn-iniciar"]').disabled);
 await page.getByLabel('Tipo de entrada',{exact:true}).selectOption('blog_personal');await page.locator('[data-ui-id="ingreso.ofuscada"]').check();
 await page.locator('textarea').fill('Crónica de prueba sin datos personales.');await page.getByRole('button',{name:'Confirmar edición',exact:true}).click();await page.waitForTimeout(1700);
 assert.equal(posts.some(x=>x.path==='/api/dictado'),false,'selection and checkpoint must not archive');
 assert.equal(posts.some(x=>x.path.startsWith('/api/blog')),false,'selection must not publish');
 const checkpoint=posts.filter(x=>x.path==='/api/dictado/checkpoint').map(x=>JSON.parse(x.body)).at(-1);assert.equal(checkpoint.tipoEntrada,'blog_personal');assert.equal(checkpoint.ofuscada,true);
 await page.locator('[data-ui-id="ingreso.btn-archivar"]').click();await page.waitForTimeout(1200);
 assert.equal(archivePayload.tipoEntrada,'blog_personal');assert.equal(archivePayload.ofuscada,true);
 const records=await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('khora-custodia-v1');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const read=(store,id)=>new Promise((resolve,reject)=>{const q=id?db.transaction(store).objectStore(store).get(id):db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const key=await read('keys','test-owner'),rows=await read('records');const result=[];for(const row of rows.filter(x=>x.kind==='publication')){const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:new TextEncoder().encode(row.owner+':'+row.id)},key,row.data);result.push({row,body:JSON.parse(new TextDecoder().decode(bytes))});}db.close();return result;});
 assert.equal(records.length,1);assert.equal(records[0].body.intent.decision,null);assert.equal(JSON.stringify(records[0].row).includes('Crónica'),false);
 if(bad){assert.equal(records[0].body.receipt,undefined);assert.match(await page.locator('[role="alert"]').innerText(),/recibo no acredita/);assert.equal(await page.getByText('Captura archivada',{exact:true}).count(),0);}
 else {assert.equal(records[0].body.intent.state,'awaiting_decision');assert.equal(records[0].body.receipt.version,1);await page.getByText('Captura archivada',{exact:true}).waitFor();await page.reload();await page.locator('[data-ui-id="ingreso.publicacion-pendiente"]').waitFor();}
 assert.equal(posts.some(x=>x.path.startsWith('/api/blog')),false);
 if(!bad&&decline){
  await page.getByRole('button',{name:'No, conservar sin publicar',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-ui-id="ingreso.publicacion-pendiente"]'));
  const declines=posts.filter(x=>x.path==='/api/blog/editorial').map(x=>JSON.parse(x.body));assert.equal(declines.length,1);assert.equal(declines[0].action,'decline_archived');assert.equal(declines[0]._norm_turn_token,undefined);assert.equal(declines[0].reference.sourceId,'2c294d17-a175-415e-b5f5-df0245fa7d4a');assert.equal(decisions,0);
 }
 if(!bad&&!decline){
  const yes=page.getByRole('button',{name:'Sí, publicar en ambos',exact:true});assert.equal(await yes.isDisabled(),true);
  await page.getByLabel('Título público',{exact:true}).fill('Crónica de prueba');await page.getByLabel('Formato de Facebook',{exact:true}).selectOption('link');await page.getByLabel('Texto exacto de Facebook',{exact:true}).fill('Crónica pública de prueba.');
  await page.getByRole('button',{name:'Preparar vista previa de ambos destinos',exact:true}).click();await page.getByText('NORMATIVE_TURN_UNAVAILABLE',{exact:true}).waitFor();assert.equal(await yes.isDisabled(),true);
  normativeFail=false;await page.reload();await page.getByRole('button',{name:'Recuperar la misma vista previa',exact:true}).click();await page.getByRole('region',{name:'Vista previa verificada',exact:true}).waitFor();
  assert.equal(await yes.isDisabled(),true,'ofuscada still needs exposure');
  await page.getByLabel('He revisado este texto ofuscado',{exact:false}).check();assert.equal(await yes.isDisabled(),false);
  await yes.click();await page.getByText(/La captura archivada se conserva; no se repetirá/).waitFor();assert.equal(decisions,1);
  await page.getByRole('button',{name:'Comprobar estado sin reenviar publicaciones',exact:true}).click();await page.getByText('Blog · revisión 1: confirmed',{exact:true}).waitFor();assert.equal(await page.getByText('Publicación confirmada en ambos destinos.',{exact:true}).count(),0);
  both=true;await page.getByRole('button',{name:'Comprobar estado sin reenviar publicaciones',exact:true}).click();await page.getByText('Publicación confirmada en ambos destinos.',{exact:true}).waitFor();assert.equal(decisions,1);
  assert.equal(posts.filter(x=>x.path==='/api/dictado').length,1);

 }
 assert.deepEqual(errors,[]);
 results.push({scenario:bad?'reject forged hash receipt':decline?'No before preview and without normative token':'manual archive, encrypted intent reload, normative failure, exact text preview, text-only cut explicit consent and independent dual confirmation',classification:true,implicitConsent:false,errors});await context.close();}

 try{await run();await run(true);await run(false,true);fs.writeFileSync(root+'/evidence/archive-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
