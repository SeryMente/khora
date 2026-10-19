/** Isolated LOCAL React UI + real Chromium/WebCrypto + synthetic owner HTTP API.
 * NOT Next build, real authentication, PostgreSQL, normative service or publication proof.
 * Dependencies: project's React/react-dom, esbuild (tsx dependency), Playwright, Chromium.
 * Run from khora-web: node tests/browser/blog-text-workflow.local.test.mjs
 */
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),temp=await mkdtemp(path.join(tmpdir(),'khora-blog-text-'));
const output=process.env.BLOG_BROWSER_EVIDENCE||path.join(temp,'evidence');await mkdir(output,{recursive:true});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=s=>createHash('sha256').update(s).digest('hex');
const entry=path.join(temp,'entry.tsx');await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import BlogTextWorkspace from ${JSON.stringify(path.join(root,'app/components/blog/BlogTextWorkspace.tsx'))};createRoot(document.getElementById('root')!).render(<BlogTextWorkspace/>);`);
const bundled=await build({entryPoints:[entry],absWorkingDir:root,bundle:true,write:false,jsx:'automatic',platform:'browser',nodePaths:[path.resolve(root,'node_modules'),...(process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean)],define:{'process.env.NODE_ENV':'"production"'}});
const js=bundled.outputFiles[0].text;
const calls=[],rows=new Map();let checks=0,browser,server,debugPage;
function check(value,message){assert(value,message);checks++;}
server=createServer(async(req,res)=>{
 try{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
  if(req.method==='GET'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--khora-bg:#0A0A0B;--khora-ink:#C7CCD1;--khora-surface:#17181A;--khora-border:#23252A;--khora-accent:#8A9BA8}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:var(--khora-bg);color:var(--khora-ink)}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #8A9BA8;outline-offset:3px}a{color:#9bbfe0}h2{font-size:24px;margin:0}p{margin:0 0 8px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);return;}
  let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);calls.push({url:req.url,body:b});let value;
  if(req.url==='/api/dictado')value={id:'11111111-1111-4111-8111-111111111111',version:1,sessionId:b.sessionId,sha256:hash(b.texto),chars:b.texto.length,tipoEntrada:b.tipoEntrada,ofuscada:b.ofuscada,mp3Estado:'no_aplica'};
  else if(b.action==='open_turn')value={turn:{status:'OPEN',turn_token:'SYNTHETIC-NORM-TOKEN'}};
  else if(b.action==='prepare'){
   const r=b.revision;rows.set(r.publicationId,{r,consent:'pending',delivered:false});value={publicationId:r.publicationId,revision:r.revision,digest:hash(canonical(r)),preview:r.entry,facebook:r.facebook,representation:'text_only',audioPublic:false,destinations:['blog','facebook']};
  }else{
   const row=rows.get(b.publicationId),r=row?.r;
   if(!r)throw Error('fixture needs prepared row');
   const status=()=>({id:r.publicationId,revision:r.revision,consent:row.consent,filter:row.delivered?'published_both':row.consent==='approved'?'publication_pending':row.consent==='declined'?'archived_without_permission':'awaiting_decision',deliveries:row.delivered?['blog','facebook'].map(target=>({revision:r.revision,target,state:'confirmed',url:target==='blog'?'https://example.invalid/blog/':'https://www.facebook.com/fixture',proof_hash:hash(target)})):[]});
   if(b.action==='decide'){assert.equal(b.digest,hash(canonical(r)));row.consent=b.decision?'approved':'declined';value=status();}
   else if(b.action==='status')value=status();
   else if(b.action==='resume')value={revision:r,digest:hash(canonical(r)),status:status()};
   else throw Error('unexpected fixture action');
  }
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));
 }catch{res.statusCode=500;res.end('{}');}
});
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||execFileSync('sh',['-c','command -v chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();debugPage=page;page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin);await page.getByRole('button',{name:'Conservar original y preparar borrador'}).waitFor();
 check(await page.getByRole('button',{name:'Conservar original y preparar borrador'}).isDisabled(),'empty original cannot archive');
 check(await page.locator('audio,input[type=file]').count()===0,'no audio prerequisite');
 await page.screenshot({path:path.join(output,'01-desktop-original.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'02-mobile-original.png'),fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile original no overflow');
 const text='Ayer caminé.\n\nSentí calma. <script>window.__unsafe=1</script>';
 await page.getByLabel('Texto original',{exact:true}).fill(text);await page.getByRole('button',{name:'Conservar original y preparar borrador'}).click();
 await page.getByText('Original archivado con recibo verificado.',{exact:false}).waitFor();
 check(calls.filter(c=>c.url==='/api/dictado').length===1,'one archive request');check(calls[0].body.texto===text,'original immutable bytes');check(calls[0].body.fuenteEntrada==='texto','text source');
 check(await page.getByRole('button',{name:'Preparar y verificar previa exacta'}).isDisabled(),'explicit Facebook format required');
 await page.getByLabel('Formato en Facebook',{exact:true}).selectOption('link');await page.getByLabel('Texto exacto de Facebook').fill('Mensaje exacto sintético.');
 await page.getByRole('button',{name:'Preparar y verificar previa exacta'}).click();await page.getByRole('heading',{name:'3. Revisa antes de autorizar'}).waitFor();
 check(calls.filter(c=>c.body.action==='decide').length===0,'no implicit approval');check(!await page.evaluate(()=>window.__unsafe),'public text escaped');
 await page.screenshot({path:path.join(output,'03-mobile-exact-preview.png'),fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile preview no overflow');
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(output,'04-desktop-exact-preview.png'),fullPage:true});
 await page.getByRole('button',{name:'No, conservar sin permiso',exact:true}).click();await page.getByText('Conservada sin permiso de publicación.',{exact:true}).waitFor();
 check(calls.filter(c=>c.body.action==='decide'&&c.body.decision===false).length===1,'explicit refusal recorded');
 await page.getByRole('button',{name:'Preparar y verificar previa exacta'}).click();await page.getByText('Revisión 2 · Huella exacta:',{exact:false}).waitFor();
 check(calls.filter(c=>c.body.action==='prepare').at(-1).body.revision.revision===2,'new revision after refusal');
 await page.getByRole('button',{name:'Sí, publicar esta versión exacta en ambos'}).click();await page.getByText('Aprobación enviada.',{exact:false}).waitFor();
 check(await page.getByLabel('Título público',{exact:true}).isDisabled(),'approved draft frozen');
 check(!await page.getByText('Publicación comprobada en ambos destinos.',{exact:true}).count(),'pending not declared published');
 const journal=await page.evaluate(()=>JSON.stringify({session:{...sessionStorage},local:{...localStorage}}));
 check(!journal.includes(text)&&!journal.includes('SYNTHETIC-NORM-TOKEN')&&!journal.includes('Mensaje exacto'),'browser storage has references only');
 for(const row of rows.values())row.delivered=true;
 await page.getByRole('button',{name:'Actualizar comprobantes',exact:true}).click();await page.getByText('Publicación comprobada en ambos destinos.',{exact:true}).waitFor();
 check(await page.getByRole('link',{name:'Abrir comprobante'}).count()===2,'separate destination receipts');
 await page.screenshot({path:path.join(output,'05-desktop-fixture-receipts.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'06-mobile-fixture-receipts.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Recuperar revisión preparada'}).click();await page.getByRole('heading',{name:'3. Revisa antes de autorizar'}).waitFor();
 check(await page.getByLabel('Texto público del blog').inputValue()===text,'authenticated fixture resume restores exact public selection');
 check(await page.getByLabel('Texto original',{exact:true}).inputValue()==='','resume never restores private original from server');
 check(calls.filter(c=>c.body.action==='decide'&&c.body.decision===true).length===1,'reload/status never resubmits consent');
 check(!calls.some(c=>c.url==='/api/blog/dispatch'),'browser never holds dispatch secret or calls dispatch');
 check(errors.length===0,'no browser runtime errors');
 await writeFile(path.join(output,'browser-report.json'),JSON.stringify({scope:'isolated local React/WebCrypto; synthetic HTTP API, receipts and auth/normative; NO real publication',checks,apiRequests:calls.length,archiveRequests:calls.filter(c=>c.url==='/api/dictado').length,approvalRequests:calls.filter(c=>c.body.action==='decide'&&c.body.decision===true).length,errors},null,2));
 console.log(JSON.stringify({checks,scope:'local UI, synthetic HTTP, no publication',output}));
}catch(e){if(debugPage){console.error('DIAGNOSTIC',await debugPage.locator('label').allTextContents());console.error('BODY',await debugPage.locator('body').innerText());await debugPage.screenshot({path:path.join(output,'failure.png'),fullPage:true});}throw e;}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
