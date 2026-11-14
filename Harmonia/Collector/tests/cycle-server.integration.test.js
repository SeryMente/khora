'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const net=require('node:net');

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
async function waitReady(url,headers,child){
 const deadline=Date.now()+10000;
 while(Date.now()<deadline){
  if(child.exitCode!==null)throw new Error('collector exited before ready');
  try{const response=await fetch(url+'/health',{headers});if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw new Error('collector readiness timeout');
}
async function stopChild(child){
 if(child.exitCode!==null)return;
 child.kill();
 await new Promise(resolve=>{const timeout=setTimeout(resolve,1500);child.once('exit',()=>{clearTimeout(timeout);resolve();});});
}
function event({eventId,type,payload,capturedAt='2026-11-13T20:30:00.000Z',source='activity-observer',sessionId='123e4567-e89b-42d3-a456-426614174000'}){
 return {schema:'harmonia.event.v1',eventId,sessionId,type,source,capturedAt,payload};
}
function activityPayload(state='ACTIVE',transition='ACTIVATED'){
 return {state,transition,signal_ids:state==='ACTIVE'?['aria-busy']:[],main_present:true,main_candidate_count:1,user_message_count:2,assistant_message_count:1};
}
function containsTemporalKey(value){
 const keys=new Set(['durationMs','duration_ms','legacyDurationMs','legacy_duration_ms','elapsed_ms','elapsedMs','monotonic_ms','monotonicMs','clock_precision_ms','settle_window_ms','meanMs','medianMs','p90Ms','latencyMs','waitMs','processing_ms']);
 if(Array.isArray(value))return value.some(containsTemporalKey);
 if(!value||typeof value!=='object')return false;
 return Object.entries(value).some(([key,child])=>keys.has(key)||containsTemporalKey(child));
}

test('activity contract, idempotency, JSONL persistence and temporal API rejection',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'harmonia-activity-server-'));
 const legacyIndex={
  schema:'harmonia.index.v1',cycles:{legacyCycle:{duration_ms:2500,complete:true}},
  cycleDiagnostics:{totalCount:1,byStage:{completed:1},lastDecision:'MEASURED',medianMs:2500},
  sessions:{legacySession:{firstAt:'2026-11-13T20:00:00.000Z',lastAt:'2026-11-13T20:01:00.000Z',events:3,types:{'capture.started':1,'client.cycle.completed':1,'diag.cycle.trace':1},file:'originals/legacy-session.jsonl'}},
  seenEventIds:{legacyCycleEvent:{storedType:'client.cycle.completed',sessionId:'legacySession',ordinal:2,capturedAt:'2026-11-13T20:01:00.000Z'}}
 };
 fs.writeFileSync(path.join(root,'index.json'),JSON.stringify(legacyIndex),'utf8');
 const port=await freePort();
 const token='synthetic-local-test-token';
 const headers={'x-harmonia-token':token,'content-type':'application/json'};
 const serverPath=path.join(__dirname,'..','server.js');
 const child=spawn(process.execPath,[serverPath],{
  env:{...process.env,HARMONIA_PORT:String(port),HARMONIA_TOKEN:token,HARMONIA_DATA:root,HARMONIA_MAX_ACTIVITY_DIAGNOSTIC_EVENTS:'1'},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 const base='http://127.0.0.1:'+port;
 const post=value=>fetch(base+'/events',{method:'POST',headers,body:JSON.stringify(value)});
 try{
  await waitReady(base,headers,child);
  const healthResponse=await fetch(base+'/health',{headers});
  assert.equal(healthResponse.status,200);
  const health=await healthResponse.json();
  assert.equal(health.collectorVersion,'0.6.0');
  assert.equal(health.catalogVersion,'0.1.3');

  const start=event({
   eventId:'123e4567-e89b-42d3-a456-426614174001',
   type:'capture.started',source:'extension',
   payload:{url:'https://chatgpt.com/c/synthetic-private-id',version:'0.6.0',mode:'automatic-interface-architecture'}
  });
  assert.equal((await post(start)).status,201);

  const stop=event({
   eventId:'123e4567-e89b-42d3-a456-426614174002',
   type:'capture.stopped',source:'extension',
   payload:{reason:'tab-closed',durationMs:2500,duration_ms:2500}
  });
  assert.equal((await post(stop)).status,201);

  const activity=event({
   eventId:'123e4567-e89b-42d3-a456-426614174003',
   type:'ui.activity.state',payload:activityPayload()
  });
  const activityResponse=await post(activity);
  assert.equal(activityResponse.status,201);
  const activityDuplicate=await post(activity);
  assert.equal(activityDuplicate.status,200);
  assert.equal((await activityDuplicate.json()).duplicate,true);

  const activitySummaryResponse=await fetch(base+'/activity',{headers});
  assert.equal(activitySummaryResponse.status,200);
  const activitySummary=await activitySummaryResponse.json();
  assert.equal(activitySummary.schema,'harmonia.activity-summary.v1');
  assert.equal(activitySummary.totalCount,1);
  assert.equal(activitySummary.activeStates,1);
  assert.equal(activitySummary.inactiveStates,0);
  assert.equal(activitySummary.transitions.ACTIVATED,1);
  assert.equal('durationMs' in activitySummary,false);
  assert.equal(containsTemporalKey(activitySummary),false);

  const diagnostic=event({
   eventId:'123e4567-e89b-42d3-a456-426614174004',
   type:'diag.activity.trace',source:'activity-observer-diagnostic',
   payload:{sequence:1,stage:'activity_transition',state:'ACTIVE',transition:'ACTIVATED',signal_ids:['aria-busy'],user_message_count:2,assistant_message_count:1}
  });
  assert.equal((await post(diagnostic)).status,201);
  assert.equal((await post(diagnostic)).status,200);
  const overLimit=event({
   eventId:'123e4567-e89b-42d3-a456-426614174005',
   type:'diag.activity.trace',source:'activity-observer-diagnostic',
   payload:{sequence:2,stage:'main_state',main_present:true,main_candidate_count:1}
  });
  assert.equal((await post(overLimit)).status,429);

  const diagnosticSummaryResponse=await fetch(base+'/activity-diagnostics',{headers});
  assert.equal(diagnosticSummaryResponse.status,200);
  const diagnosticSummary=await diagnosticSummaryResponse.json();
  assert.equal(diagnosticSummary.totalCount,1);
  assert.equal(diagnosticSummary.byStage.activity_transition,1);
  assert.equal(containsTemporalKey(diagnosticSummary),false);

  const badActivity=event({
   eventId:'123e4567-e89b-42d3-a456-426614174006',
   type:'ui.activity.state',payload:{...activityPayload(),duration_ms:25}
  });
  const badResponse=await post(badActivity);
  assert.equal(badResponse.status,400);
  assert.equal((await badResponse.json()).error,'temporal-field-disabled-by-metacanon-52');

  const legacyCycle=event({
   eventId:'123e4567-e89b-42d3-a456-426614174007',
   type:'client.cycle.completed',source:'legacy-cycle-observer',
   payload:{duration_ms:2500}
  });
  const legacyResponse=await post(legacyCycle);
  assert.equal(legacyResponse.status,410);
  assert.equal((await legacyResponse.json()).error,'temporal-event-disabled-by-metacanon-52');

  for(const endpoint of ['/cycles','/cycle-diagnostics']){
   const response=await fetch(base+endpoint,{headers});
   assert.equal(response.status,410,endpoint);
   assert.equal((await response.json()).error,'temporal-metrics-disabled-by-metacanon-52');
  }
  assert.equal((await fetch(base+'/cycles')).status,401);
  assert.equal((await fetch(base+'/activity')).status,401);

  const publicIndexResponse=await fetch(base+'/index',{headers});
  assert.equal(publicIndexResponse.status,200);
  const publicIndex=await publicIndexResponse.json();
  assert.equal('cycles' in publicIndex,false);
  assert.equal('cycleDiagnostics' in publicIndex,false);
  assert.equal('legacyTemporalAggregateQuarantine' in publicIndex,false);
  assert.equal(publicIndex.activity.totalCount,1);
  assert.equal(containsTemporalKey(publicIndex),false);
  const persistedIndex=JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8'));
  assert.equal('cycles' in persistedIndex,false);
  assert.equal('cycleDiagnostics' in persistedIndex,false);
  assert.equal(persistedIndex.legacyTemporalAggregateQuarantine.schema,'harmonia.legacy-temporal-aggregate-quarantine.v1');
  assert.deepEqual(persistedIndex.legacyTemporalAggregateQuarantine.cycles.legacyCycle,{duration_ms:2500,complete:true});
  assert.equal(persistedIndex.legacyTemporalAggregateQuarantine.cycleDiagnostics.lastDecision,'MEASURED');
  assert.equal(persistedIndex.sessions.legacySession.events,1);
  assert.deepEqual(persistedIndex.sessions.legacySession.types,{'capture.started':1});
  assert.deepEqual(persistedIndex.legacyTemporalAggregateQuarantine.sessions.legacySession,{events:2,types:{'client.cycle.completed':1,'diag.cycle.trace':1}});
  assert.equal('legacyCycleEvent' in persistedIndex.seenEventIds,false);
  assert.equal(persistedIndex.legacyTemporalAggregateQuarantine.seenEventIds.legacyCycleEvent.storedType,'client.cycle.completed');

  const dateDir=path.join(root,'originals','2026-11-13');
  const logPath=path.join(dateDir,'123e4567-e89b-42d3-a456-426614174000.jsonl');
  const stored=fs.readFileSync(logPath,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(stored.length,4);
  const storedStop=stored.find(item=>item.type==='capture.stopped');
  assert.deepEqual(storedStop.payload,{reason:'tab-closed'});
  assert.equal(stored.some(item=>item.type==='client.cycle.completed'),false);
  const storedActivity=stored.find(item=>item.type==='ui.activity.state');
  assert.deepEqual(storedActivity.payload,activityPayload());
  const storedDiagnostic=stored.find(item=>item.type==='diag.activity.trace');
  assert.equal(storedDiagnostic.payload.stage,'activity_transition');
  assert.equal('conversation' in storedDiagnostic,false);
  assert.equal(containsTemporalKey(stored),false);
  assert.equal(JSON.stringify(stored).includes('synthetic-private-id'),false);
 }catch(error){
  if(stderr)error.message+='; collector stderr: '+stderr;
  throw error;
 }finally{
  await stopChild(child);
  fs.rmSync(root,{recursive:true,force:true});
 }
});
