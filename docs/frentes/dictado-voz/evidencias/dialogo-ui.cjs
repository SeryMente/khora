/** Controlled UI integration: real IndexedDB/WebCrypto/MediaRecorder, simulated authentication/network/provider. */
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict"),{createHash}=require("node:crypto"),{spawnSync}=require("node:child_process");
async function main(){
 const {chromium}=require("playwright"),esbuild=require("esbuild"),root=path.resolve(__dirname,"../../../..");
 const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{DialogoPanel}from '${root}/khora-web/app/components/ingreso/DialogoPanel.tsx';createRoot(document.getElementById('root')).render(React.createElement(DialogoPanel,{sessionId:new URLSearchParams(location.search).get('sessionId')}));`;
 const js=await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:"tsx"},bundle:true,write:false,format:"iife",jsx:"automatic",nodePaths:[path.dirname(require.resolve("react/package.json"))+"/.."],plugins:[{name:"css-test-adapter",setup(b){b.onResolve({filter:/\.module\.css$/},a=>({path:a.path,namespace:"test-css"}));b.onLoad({filter:/.*/,namespace:"test-css"},()=>({contents:"export default {}",loader:"js"}));}}]});
 // CSS imports intentionally removed for functional test only, not a visual approval.
 const code=js.outputFiles[0].text;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.startsWith('/app.js')?'text/javascript':'text/html');res.end(req.url.startsWith('/app.js')?code:'<html><body><div id="root"></div><script src="/app.js"></script></body></html>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const exe=process.env.CHROMIUM_EXECUTABLE_PATH||spawnSync('which',['chromium'],{encoding:'utf8'}).stdout.trim();
 const browser=await chromium.launch({executablePath:exe||undefined,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const receipts=[],uploads=[];
 try{
  const context=await browser.newContext({acceptDownloads:true});
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url());let body;
   if(url.pathname==='/api/dictado/checkpoint'){
    if(req.method()==='GET')body=url.searchParams.get('bootstrap')?{owner:'synthetic-owner'}:{owner:'synthetic-owner',recovery:receipts.at(-1)};
    else{const s=req.postDataJSON();receipts.push(s);body={ok:true,sessionId:s.sessionId,revisionId:s.revisionId};}
   }else if(url.pathname==='/api/audio'){
    const request=new Request('http://local.invalid',{method:'POST',headers:{'Content-Type':req.headers()['content-type']},body:req.postDataBuffer()});const form=await request.formData(),file=form.get('audio');const bytes=Buffer.from(await file.arrayBuffer());uploads.push({source:form.get('fuenteAudio'),part:Number(form.get('parte')),bytes:bytes.length});body={verificado:true,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:'https://synthetic.blob.vercel-storage.com/test'};
   }else if(url.pathname==='/api/transcribir/dialogo')body={exito:true,turnos:[{fuente:'microphone',start_ms:0,end_ms:900,texto:'Hello'},{fuente:'chrome_tab',start_ms:1000,end_ms:1900,texto:'Hola'}]};
   else throw Error('unexpected_route:'+url.pathname);
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const source=f=>{const c=new AudioContext(),o=c.createOscillator(),d=c.createMediaStreamDestination();o.frequency.value=f;o.connect(d);o.start();return d.stream;};Object.defineProperty(navigator,'mediaDevices',{value:{getDisplayMedia:async()=>source(880),getUserMedia:async()=>source(440)}});});
  await page.goto(origin+'/sistema/ingreso?modo=dialogo');
  const start=page.getByRole('button',{name:'Iniciar Chrome + micrófono'});await start.waitFor();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Iniciar Chrome'))?.disabled);
  await start.click();await page.getByRole('button',{name:'Detener ambas fuentes'}).waitFor();await page.waitForTimeout(6200);await page.getByRole('button',{name:'Detener ambas fuentes'}).click();
  const transcribe=page.getByRole('button',{name:'Transcribir diálogo'});await transcribe.waitFor();await transcribe.click();await page.waitForFunction(()=>document.querySelector('#dialogo-text')?.value.includes('Hello'));
  assert.equal(receipts.at(-1).dialogo.estado,'detenido');assert.equal(receipts.at(-1).dialogo.partesEsperadas,4);assert.equal(uploads.length,4);assert.equal(new Set(uploads.map(x=>x.source)).size,2);
  const local=await page.evaluate(()=>new Promise((resolve,reject)=>{const op=indexedDB.open('khora-custodia-v1');op.onsuccess=()=>{const req=op.result.transaction('records').objectStore('records').getAll();req.onsuccess=()=>{const rows=req.result;resolve({audio:rows.filter(x=>x.kind==='audio').length,encrypted:rows.every(x=>x.data instanceof ArrayBuffer&&!x.blob&&!x.texto)});op.result.close();};req.onerror=()=>reject(req.error);};}));
  assert.equal(local.audio,4);assert.equal(local.encrypted,true);assert.equal(errors.length,0);
  const second=await context.newPage();await second.goto(page.url());await second.getByRole('alert').filter({hasText:'otra pestaña'}).waitFor();await second.close();
  const result={kind:'controlled-ui-network-adapters',uploads:uploads.length,encryptedLocalAudioParts:local.audio,checkpointState:receipts.at(-1).dialogo.estado,dialoguePersisted:true,concurrentWriterBlocked:true,pageErrors:errors.length,visualAcceptance:false};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exit(1);});
