'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');

const collectorPath=path.resolve(__dirname,'../collector/server.js');
const token='harmonia-test-token-not-for-production';

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>error?reject(error):resolve()));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
async function waitForHealth(base,child){
 for(let attempt=0;attempt<60;attempt++){
  if(child.exitCode!==null)throw new Error('El colector terminó antes de iniciar.');
  try{
   const response=await fetch(base+'/health',{headers:{'x-harmonia-token':token}});
   if(response.ok)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw new Error('El colector no alcanzó HEALTH=OK.');
}
async function startCollector(port,dataRoot){
 const child=spawn(process.execPath,[collectorPath],{
  env:{...process.env,HARMONIA_TOKEN:token,HARMONIA_PORT:String(port),HARMONIA_DATA:dataRoot},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 await waitForHealth(`http://127.0.0.1:${port}`,child).catch(error=>{throw new Error(error.message+' '+stderr);});
 return child;
}
async function stopCollector(child){
 if(!child||child.exitCode!==null)return;
 child.kill('SIGTERM');
 await new Promise(resolve=>{
  const timer=setTimeout(resolve,2000);
  child.once('exit',()=>{clearTimeout(timer);resolve();});
 });
}
async function request(base,pathname,method='GET',body){
 const response=await fetch(base+pathname,{
  method,
  headers:{'x-harmonia-token':token,'content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 const data=await response.json();
 return {status:response.status,data};
}

test('local outbox persists, excludes full surface details, and acknowledges idempotently after restart',async t=>{
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'harmonia-cora-sync-'));
 const port=await freePort(),base=`http://127.0.0.1:${port}`;
 let child=await startCollector(port,dataRoot);
 t.after(async()=>{await stopCollector(child);fs.rmSync(dataRoot,{recursive:true,force:true});});

 const event={
  schema:'harmonia.event.v1',
  eventId:crypto.randomUUID(),
  sessionId:crypto.randomUUID(),
  conversation:'tab-42',
  type:'ui.surface.scan',
  source:'page-observer',
  capturedAt:new Date().toISOString(),
  payload:{
   fingerprint:'a'.repeat(64),catalogVersion:'1.2.0',features:['chat.thread','composer.input'],
   controls:[{tag:'button',role:'button',label:'PRIVATE_LABEL_NOT_FOR_CORA',testId:'send-button',placeholder:'PRIVATE_PLACEHOLDER'}],
   structure:{nodes:[{depth:0,tag:'main',role:'main',testId:'PRIVATE_DOM_NODE',classes:['thread']}],total:40,truncated:false},
   stylesheets:[{index:0,path:'/PRIVATE_STYLESHEET_PATH.css',ruleCount:10}],
   viewport:{width:1280,height:800,devicePixelRatio:1},
   layout:{main:{tag:'main',role:'main',testId:'main'}},
   counts:{controls:1,userMessages:4,assistantMessages:5,styleSheets:1}
  }
 };
 const ingest=await request(base,'/events','POST',event);
 assert.equal(ingest.status,201);
 assert.equal(ingest.data.ok,true);

 const firstStatus=await request(base,'/sync/status');
 assert.equal(firstStatus.data.pending,1);
 assert.equal(firstStatus.data.local_only,0);

 const firstBatch=await request(base,'/sync/pending?limit=50');
 assert.equal(firstBatch.status,200);
 assert.equal(firstBatch.data.events.length,1);
 const remoteText=JSON.stringify(firstBatch.data.events);
 assert.equal(remoteText.includes('PRIVATE_LABEL_NOT_FOR_CORA'),false);
 assert.equal(remoteText.includes('PRIVATE_PLACEHOLDER'),false);
 assert.equal(remoteText.includes('PRIVATE_DOM_NODE'),false);
 assert.equal(remoteText.includes('PRIVATE_STYLESHEET_PATH'),false);
 assert.equal('payload' in firstBatch.data.events[0],false);
 assert.equal(firstBatch.data.events[0].privacy_class,'ANONYMIZED_TELEMETRY');
 assert.equal(firstBatch.data.events[0].metrics.surface_fingerprint,'a'.repeat(64));
 assert.equal(fs.readdirSync(path.join(dataRoot,'surfaces')).length,1);

 await stopCollector(child);
 child=await startCollector(port,dataRoot);
 const afterRestart=await request(base,'/sync/pending?limit=50');
 assert.equal(afterRestart.data.events.length,1);
 assert.equal(afterRestart.data.events[0].event_uuid,event.eventId);

 const ids=[event.eventId];
 const ack=await request(base,'/sync/ack','POST',{batch_id:crypto.randomUUID(),event_uuids:ids});
 assert.equal(ack.status,200);
 assert.equal(ack.data.ok,true);
 assert.equal(ack.data.acknowledged,1);
 assert.equal(ack.data.pending,0);

 const replayAck=await request(base,'/sync/ack','POST',{batch_id:crypto.randomUUID(),event_uuids:ids});
 assert.equal(replayAck.status,200);
 assert.equal(replayAck.data.alreadyAcknowledged,1);
 const finalStatus=await request(base,'/sync/status');
 assert.equal(finalStatus.data.pending,0);
 assert.equal(finalStatus.data.accepted,1);
});
