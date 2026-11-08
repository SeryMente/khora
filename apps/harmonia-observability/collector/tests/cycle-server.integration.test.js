'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process'),net=require('node:net');
async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function waitReady(url,headers,child){
 const deadline=Date.now()+10000;
 while(Date.now()<deadline){
  if(child.exitCode!==null)throw new Error('collector exited before ready');
  try{const response=await fetch(url+'/health',{headers});if(response.ok)return;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw new Error('collector readiness timeout');
}
async function stopChild(child){
 if(child.exitCode!==null)return;
 child.kill();
 await new Promise(resolve=>{
  const timeout=setTimeout(resolve,1500);
  child.once('exit',()=>{clearTimeout(timeout);resolve();});
 });
}
test('synthetic integration: strict validation, pairing, idempotency and JSONL persistence',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'harmonia-cycle-server-'));
 const port=await freePort(),token='synthetic-local-test-token',headers={'x-harmonia-token':token,'content-type':'application/json'};
 const serverPath=path.join(__dirname,'..','server.js');
 const child=spawn(process.execPath,[serverPath],{env:{...process.env,HARMONIA_PORT:String(port),HARMONIA_TOKEN:token,HARMONIA_DATA:root},stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 const base='http://127.0.0.1:'+port+'/events',sessionId='123e4567-e89b-42d3-a456-426614174000';
 const conversationId='018bcfe5-6800-7000-8000-000000000001',cycleId='018bcfe5-6800-7000-8000-000000000002';
 const t0='2026-11-08T16:00:00.100Z',t1='2026-11-08T16:00:02.600Z';
 const start={schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174001',sessionId,type:'client.cycle.started',source:'cycle-observer',capturedAt:t0,payload:{conversation_id:conversationId,cycle_id:cycleId,phase:'started',timestamp_utc:t0,monotonic_ms:100,clock_source:'performance.now',clock_precision_ms:0.001,coverage:'new-dom-node-v1',settle_window_ms:1500}};
 const complete={schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174002',sessionId,type:'client.cycle.completed',source:'cycle-observer',capturedAt:t1,payload:{conversation_id:conversationId,cycle_id:cycleId,phase:'completed',timestamp_utc:t1,monotonic_ms:2600,duration_ms:2500,clock_source:'performance.now',clock_precision_ms:0.001,coverage:'new-dom-node-v1',settle_window_ms:1500}};
 try{
  await waitReady('http://127.0.0.1:'+port,headers,child);
  const post=event=>fetch(base,{method:'POST',headers,body:JSON.stringify(event)});
  const accepted=await post(start);assert.equal(accepted.status,201);
  const duplicate=await post(start);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);
  const altered=await post({...start,payload:{...start.payload,monotonic_ms:101}});assert.equal(altered.status,409);
  const rejected=await post({...start,eventId:'123e4567-e89b-42d3-a456-426614174003',payload:{...start.payload,message:'must not persist'}});assert.equal(rejected.status,400);
  const completed=await post(complete);assert.equal(completed.status,201);
  const duplicateEnd=await post(complete);assert.equal(duplicateEnd.status,200);assert.equal((await duplicateEnd.json()).duplicate,true);
  const missing=await post({...complete,eventId:'123e4567-e89b-42d3-a456-426614174004',payload:{...complete.payload,cycle_id:'018bcfe5-6800-7000-8000-000000000099'}});assert.equal(missing.status,409);
  const file=path.join(root,'originals',t0.slice(0,10),sessionId+'.jsonl');
  const lines=fs.readFileSync(file,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(lines.length,2);assert.equal(lines[0].type,'client.cycle.started');assert.equal(lines[1].type,'client.cycle.completed');
  assert.equal(lines[1].payload.duration_ms,2500);assert.equal(lines[0].payload.cycle_id,lines[1].payload.cycle_id);
  assert.equal(Object.hasOwn(lines[0].payload,'message'),false);assert.equal(Object.hasOwn(lines[1],'conversation'),false);
 }catch(error){if(stderr)error.message+='; collector stderr: '+stderr;throw error;}
 finally{await stopChild(child);fs.rmSync(root,{recursive:true,force:true});}
});