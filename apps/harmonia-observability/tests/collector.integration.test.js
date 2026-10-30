'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const serverPath=path.join(root,'collector','server.js');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'coverage-catalog.json'),'utf8'));
const token='a'.repeat(64);

function uuid(){return crypto.randomUUID();}
async function freePort(){
 return await new Promise((resolve,reject)=>{
  const server=net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(e=>e?reject(e):resolve(p));});
 });
}
async function request(base,route,options={}){
 return fetch(base+route,{...options,signal:AbortSignal.timeout(2000)});
}
async function stopCollector(base,child){
 const response=await request(base,'/shutdown',{method:'POST',headers:{'x-harmonia-token':token}});
 assert.equal(response.status,200,'el colector debe aceptar el cierre autenticado');
 await new Promise(resolve=>{
  if(child.exitCode!==null)return resolve();
  const timer=setTimeout(resolve,3000);timer.unref();
  child.once('exit',()=>{clearTimeout(timer);resolve();});
 });
 if(child.exitCode===null)child.kill('SIGTERM');
}
async function waitReady(base,child){
 const deadline=Date.now()+7000;
 while(Date.now()<deadline){
  if(child.exitCode!==null)throw new Error('El colector terminó antes de iniciar.');
  try{
   const r=await request(base,'/health',{headers:{'x-harmonia-token':token}});
   if(r.ok)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,75));
 }
 throw new Error('El colector no respondió en 7 segundos.');
}
test('collector en HTTP local: auth, CORS, deltas visibles, redacción, persistencia y completitud regional',async t=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'harmonia-e2e-'));
 const port=await freePort(),base='http://127.0.0.1:'+port;
 let child=spawn(process.execPath,[serverPath],{env:{...process.env,HARMONIA_TOKEN:token,HARMONIA_PORT:String(port),HARMONIA_DATA:data},stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
 t.after(async()=>{
  try{await request(base,'/shutdown',{method:'POST',headers:{'x-harmonia-token':token}});}catch{}
  if(child.exitCode===null){child.kill('SIGTERM');}
  await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');resolve();},1500).unref();});
  fs.rmSync(data,{recursive:true,force:true});
 });
 await waitReady(base,child);

 const noAuth=await request(base,'/health');
 assert.equal(noAuth.status,401);
 const rejectedCors=await request(base,'/events',{method:'OPTIONS',headers:{origin:'https://blocked.example','access-control-request-method':'POST'}});
 assert.equal(rejectedCors.status,403);
 const extensionCors=await request(base,'/events',{method:'OPTIONS',headers:{origin:'chrome-extension://'+'a'.repeat(32),'access-control-request-method':'POST','access-control-request-headers':'content-type,x-harmonia-token'}});
 assert.equal(extensionCors.status,204);

 const session1=uuid();
 const initialText='Respuesta visible parcial\\nSegunda línea';
 const visiblePayload={regionKey:'conversation',messageKey:'assistant:1',role:'assistant',index:1,operation:'replace',
  delta:'',text:initialText,contentSha256:crypto.createHash('sha256').update(initialText).digest('hex'),
  visible:true,streaming:true,truncated:false,hiddenReasoningCaptured:false,chunkIndex:0,chunkCount:1};
 const visibleEvent={schema:'harmonia.event.v1',eventId:uuid(),sessionId:session1,conversation:'tab-11',type:'conversation.visible.delta',
  source:'page-observer',capturedAt:new Date().toISOString(),payload:visiblePayload};
 const visibleResponse=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(visibleEvent)});
 assert.equal(visibleResponse.status,201);
 let visibleBody=await visibleResponse.json();assert.equal(visibleBody.storedType,'conversation.visible.delta');

 // The same eventId must remain idempotent after a real collector process restart.
 const originalDay=new Date().toISOString().slice(0,10);
 const originalFile=path.join(data,'originals',originalDay,session1+'.jsonl');
 const linesBeforeRestart=fs.readFileSync(originalFile,'utf8').trim().split(String.fromCharCode(10));
 assert.equal(linesBeforeRestart.filter(line=>JSON.parse(line).eventId===visibleEvent.eventId).length,1);
 await stopCollector(base,child);
 child=spawn(process.execPath,[serverPath],{env:{...process.env,HARMONIA_TOKEN:token,HARMONIA_PORT:String(port),HARMONIA_DATA:data},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
 await waitReady(base,child);
 const replayResponse=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(visibleEvent)});
 assert.equal(replayResponse.status,200,'el replay tras reinicio debe responder como duplicado');
 const replayBody=await replayResponse.json();
 assert.equal(replayBody.duplicate,true);
 const linesAfterRestart=fs.readFileSync(originalFile,'utf8').trim().split(String.fromCharCode(10));
 assert.equal(linesAfterRestart.filter(line=>JSON.parse(line).eventId===visibleEvent.eventId).length,1);

 const appendedText=initialText+' y continuación';
 const appendEvent={...visibleEvent,eventId:uuid(),payload:{...visiblePayload,operation:'append',delta:' y continuación',text:'',contentSha256:crypto.createHash('sha256').update(appendedText).digest('hex'),streaming:true,chunkIndex:0,chunkCount:1}};
 const appendResponse=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(appendEvent)});
 assert.equal(appendResponse.status,201);
 const appendBody=await appendResponse.json();assert.equal(appendBody.storedType,'conversation.visible.delta');
 const completeEvent={...visibleEvent,eventId:uuid(),payload:{...visiblePayload,operation:'complete',delta:'',text:'',contentSha256:crypto.createHash('sha256').update(appendedText).digest('hex'),streaming:false,chunkIndex:0,chunkCount:1}};
 const completeResponse=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(completeEvent)});
 assert.equal(completeResponse.status,201);

 const consoleEvent={schema:'harmonia.event.v1',eventId:uuid(),sessionId:session1,conversation:'tab-11',type:'console.observed',
  source:'page-observer',capturedAt:new Date().toISOString(),payload:{regionKey:'conversation',level:'error',entries:[
   {type:'string',value:'Bearer abcdefghijklmnop'},
   {type:'string',value:'Contact user@example.com'},
   {type:'string',value:'sk-abcdefghijklmnopqrstuvwxyz'}
  ],observedAt:new Date().toISOString()}};
 const consoleResponse=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(consoleEvent)});
 assert.equal(consoleResponse.status,201);

 const required=catalog.features.filter(f=>f.scope!=='out').map(f=>f.id);
 assert.ok(required.length>=30,'el catálogo del frente debe incluir una cobertura relevante');
 const session2=uuid();
 const regionResults=[];
 for(let i=0;i<5;i++){
  const sessionId=i<3?session1:session2;
  const fingerprint=crypto.createHash('sha256').update('surface-'+i).digest('hex');
  const event={schema:'harmonia.event.v1',eventId:uuid(),sessionId,conversation:'tab-region-'+i,type:'ui.surface.scan',
   source:'page-observer',capturedAt:new Date(Date.now()+i).toISOString(),
   payload:{catalogVersion:catalog.version,fingerprint,regionKey:'conversation',regionPolicyVersion:'1.0.0',features:required,
    controls:[],structure:{nodes:[],total:0,truncated:false},stylesheets:[],viewport:{width:1280,height:800,devicePixelRatio:1},
    layout:{},counts:{controls:0,userMessages:1,assistantMessages:1,styleSheets:0},
    privacy:{visibleMessageTextCaptured:true,composerTextCaptured:false,fieldValuesCaptured:false,hrefsCaptured:false,imageUrlsCaptured:false,hiddenReasoningCaptured:false,menusExcluded:true}}};
  const response=await request(base,'/events',{method:'POST',headers:{'content-type':'application/json','x-harmonia-token':token},body:JSON.stringify(event)});
  assert.equal(response.status,201);
  const body=await response.json();
  regionResults.push(body.regionExploration);
  if(i<4)assert.notEqual(body.regionExploration.status,'complete','no debe declarar completa una región antes de cinco superficies');
 }
 assert.equal(regionResults.at(-1).status,'complete');
 assert.equal(regionResults.at(-1).complete,true);
 assert.equal(regionResults.at(-1).distinctSurfaceCount,5);
 assert.equal(regionResults.at(-1).sessionCount,2);

 const day=new Date().toISOString().slice(0,10);
 const originals=path.join(data,'originals',day);
 const jsonl=fs.readdirSync(originals).map(name=>fs.readFileSync(path.join(originals,name),'utf8')).join('\n');
 assert.ok(jsonl.includes('Respuesta visible parcial'));
 assert.ok(jsonl.includes('Segunda línea'));
 assert.ok(jsonl.includes('[REDACTED]'));
 assert.ok(!jsonl.includes('user@example.com'));
 assert.ok(!jsonl.includes('Bearer abcdefghijklmnop'));
 assert.ok(!jsonl.includes('sk-abcdefghijklmnopqrstuvwxyz'));
 const index=JSON.parse(fs.readFileSync(path.join(data,'index.json'),'utf8'));
 assert.equal(index.coverage.regions.conversation.status,'complete');
 assert.ok(index.sessions[session1].events>=2);
 assert.ok(stderr.length===0,'stderr del colector inesperado: '+stderr);
});
