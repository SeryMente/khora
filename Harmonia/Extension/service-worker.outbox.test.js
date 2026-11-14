'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');

function eventSlot(){
 let handler=null;
 return {addListener(callback){handler=callback;},get handler(){return handler;}};
}
function mockRuntime(options={}){
 const store=structuredClone(options.initialStorage||{});
 const onMessage=eventSlot();
 const injectedScripts=[];
 const sentMessages=[];
 const postedEvents=[];
 const response=(ok,status,body)=>({ok,status,async json(){return body;}});
 const buildInfo={schema:'harmonia.repository-build.v1',version:'0.6.0',sourceRevision:'LOCAL-OMM-FUT-009-ACTIVITY',catalogVersion:'0.1.3'};
 const catalog={schema:'harmonia.coverage-catalog.v1',version:'0.1.3',features:[],sources:[]};
 const frontRegistry={schema:'harmonia.front-registry.v1',fronts:[]};
 async function fetchStub(url,request={}){
  const value=String(url);
  if(options.blockRepositorySync&&value.startsWith('https://raw.githubusercontent.com/')){
   options.onRepositoryFetch?.(value);return new Promise(()=>{});
  }
  if(value.endsWith('/front-registry.json'))return response(true,200,frontRegistry);
  if(value.endsWith('/build-info.json')||value.startsWith('chrome-extension://'))return response(true,200,buildInfo);
  if(value.endsWith('/coverage-catalog.json'))return response(true,200,catalog);
  if(value.includes('127.0.0.1:47321')){
   if(value.endsWith('/health')&&options.collectorAvailable)return response(true,200,{ok:true});
   if(value.endsWith('/coverage')&&options.collectorAvailable)return response(true,200,{schema:'harmonia.coverage.local.v1',source:'collector',scanCount:0,uniqueSurfaceCount:0,observedFeatureIds:[],featureCount:0,observedPercent:0});
   if(value.endsWith('/activity')&&options.collectorAvailable)return response(true,200,{schema:'harmonia.activity-summary.v1',totalCount:0,activeStates:0,inactiveStates:0,transitions:{INITIALIZED:0,ACTIVATED:0,DEACTIVATED:0},lastState:null,lastTransition:null,lastCapturedAt:null});
   if(value.endsWith('/activity-diagnostics')&&options.collectorAvailable)return response(true,200,{schema:'harmonia.activity-diagnostics-summary.v1',totalCount:0,byStage:{},lastStage:null,lastCapturedAt:null});
   if(value.endsWith('/fingerprints')&&options.collectorAvailable)return response(true,200,{fingerprints:[]});
   if(value.endsWith('/events')&&request.method==='POST'){
    const event=JSON.parse(request.body||'{}');postedEvents.push(event);
    if(options.collectorEventError)return response(false,options.collectorEventError.status||400,{error:options.collectorEventError.code||'synthetic-rejection'});
    return response(true,200,{ok:true,storedType:event.type,deduplicated:false});
   }
   return response(false,401,{});
  }
  if(value.startsWith('https://raw.githubusercontent.com/'))return response(false,404,{});
  throw new Error('unexpected_fetch_target');
 }
 const chrome={
  storage:{local:{
   async get(keys){if(Array.isArray(keys))return Object.fromEntries(keys.map(key=>[key,store[key]]));return {...store};},
   async set(values){Object.assign(store,structuredClone(values));}
  }},
  tabs:{
   async query(){return options.tabsToInject||[];},
   async sendMessage(tabId,message){
    sentMessages.push({tabId,message});
    if(message?.kind==='harmonia:activity-diagnostics'&&options.activityDiagnostics)return structuredClone(options.activityDiagnostics);
    return {ok:true};
   },
   onRemoved:eventSlot(),onUpdated:eventSlot()
  },
  runtime:{getURL(name){return 'chrome-extension://harmonia/'+name;},onMessage,onInstalled:eventSlot(),onStartup:eventSlot()},
  alarms:{create(){},onAlarm:eventSlot()},
  scripting:{async executeScript(details){injectedScripts.push(details);}}
 };
 const context={
  chrome,HARMONIA_TOKEN:options.token||'',crypto:webcrypto,fetch:fetchStub,URL,TextEncoder,
  console,setTimeout,clearTimeout,Date,Math,Promise,Map,Set,Object,Array,Number,String,JSON,Error,
  importScripts(...files){
   for(const file of files){
    if(file==='front-activity.js'){
     vm.runInNewContext(fs.readFileSync(path.join(__dirname,'front-activity.js'),'utf8'),context,{filename:file});
    }
   }
  }
 };
 context.globalThis=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8'),context,{filename:'service-worker.js'});
 return {context,store,injectedScripts,sentMessages,postedEvents,get listener(){return onMessage.handler;}};
}
async function deliver(runtime,message,sender={}){
 return new Promise((resolve,reject)=>{
  try{
   const keepAlive=runtime.listener(message,sender,resolve);
   if(keepAlive!==true)reject(new Error('message_listener_did_not_keep_async_channel'));
  }catch(error){reject(error);}
 });
}
function activityPayload(state='ACTIVE',transition='ACTIVATED'){
 return {
  state,transition,signal_ids:state==='ACTIVE'?['aria-busy']:[],
  main_present:true,main_candidate_count:1,user_message_count:1,assistant_message_count:0
 };
}
function assertNoTemporalFields(value){
 const forbidden=new Set(['durationMs','duration_ms','legacyDurationMs','legacy_duration_ms','elapsed_ms','monotonic_ms','clock_precision_ms','settle_window_ms','meanMs','medianMs','p90Ms','latencyMs','waitMs','processing_ms']);
 const visit=item=>{
  if(Array.isArray(item)){item.forEach(visit);return;}
  if(!item||typeof item!=='object')return;
  for(const [key,child] of Object.entries(item)){assert.equal(forbidden.has(key),false,'forbidden field: '+key);visit(child);}
 };
 visit(value);
}

test('queues structural activity states locally without message content or temporal fields',async()=>{
 const runtime=mockRuntime();
 const tab={id:17,url:'https://chatgpt.com/c/synthetic-conversation'};
 const response=await deliver(runtime,{kind:'harmonia:event',event:{type:'ui.activity.state',payload:activityPayload()}},{tab});
 assert.equal(response.ok,true);
 assert.equal(response.value.ok,true);
 const queued=runtime.store.harmoniaPendingEvents;
 assert.equal(queued.length,2);
 assert.deepEqual(queued.map(event=>event.type),['capture.started','ui.activity.state']);
 assertNoTemporalFields(queued);
 const activity=queued[1];
 assert.equal(activity.payload.state,'ACTIVE');
 assert.equal(activity.payload.transition,'ACTIVATED');
 assert.equal('conversation' in activity,false);
 assert.equal('cycle_id' in activity.payload,false);
 assert.equal('messages' in activity.payload,false);
 const state=await deliver(runtime,{kind:'harmonia:get'});
 assert.equal(state.ok,true);
 assert.equal(state.value.pendingEvents,2);
 assert.equal(state.value.activity.totalCount,1);
 assert.equal(state.value.activity.activeStates,1);
 assert.equal('cycles' in state.value,false);
 assert.equal('cycleDiagnostics' in state.value,false);
 assertNoTemporalFields(state.value);
});

test('activity diagnostics are allowlisted, bounded and omit tab/conversation identities',async()=>{
 const runtime=mockRuntime();
 const tab={id:29,url:'https://chatgpt.com/c/private-diagnostic-id'};
 const payload={stage:'activity_transition',state:'ACTIVE',transition:'ACTIVATED',signal_ids:['aria-busy'],user_message_count:1,assistant_message_count:0};
 const ack=await deliver(runtime,{kind:'harmonia:activity-diagnostic',payload},{tab});
 assert.equal(ack.ok,true);
 assert.equal(ack.value.ok,true);
 const trace=runtime.store.harmoniaPendingEvents.find(event=>event.type==='diag.activity.trace');
 assert.ok(trace);
 assert.equal(trace.payload.stage,'activity_transition');
 assert.equal('conversation' in trace,false);
 assertNoTemporalFields(trace);
 const bad=await deliver(runtime,{kind:'harmonia:activity-diagnostic',payload:{...payload,elapsed_ms:1}},{tab});
 assert.equal(bad.ok,true);
 assert.equal(bad.value,false);
 assert.equal(runtime.store.harmoniaPendingEvents.filter(event=>event.type==='diag.activity.trace').length,1);
 const state=await deliver(runtime,{kind:'harmonia:get'});
 const serialized=JSON.stringify(state.value);
 for(const privateValue of ['private-diagnostic-id','private-cycle','conversation_id'])assert.equal(JSON.stringify(trace.payload).includes(privateValue),false);
 assert.equal('tabId' in trace.payload,false);
 assert.equal('sessionId' in trace.payload,false);
 assert.equal('messages' in trace.payload,false);
});

test('startup quarantines legacy temporal cycle and capture events without transmitting or modifying them',async()=>{
 const legacyCycle={
  schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174010',
  sessionId:'123e4567-e89b-42d3-a456-426614174011',type:'client.cycle.completed',
  source:'cycle-observer',capturedAt:'2026-11-13T20:00:00.000Z',
  payload:{cycle_id:'private-cycle',duration_ms:3000,monotonic_ms:3100}
 };
 const legacyStop={
  schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174012',
  sessionId:'123e4567-e89b-42d3-a456-426614174011',type:'capture.stopped',
  source:'extension',capturedAt:'2026-11-13T20:01:00.000Z',
  payload:{reason:'tab-closed',durationMs:4500}
 };
 const safe={
  schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174013',
  sessionId:'123e4567-e89b-42d3-a456-426614174011',type:'capture.started',
  source:'extension',capturedAt:'2026-11-13T19:59:00.000Z',
  payload:{url:'https://chatgpt.com/c/[conversation]',version:'0.6.0',mode:'automatic-interface-architecture'}
 };
 const original=[legacyCycle,legacyStop,safe];
 const runtime=mockRuntime({initialStorage:{harmoniaPendingEvents:original},collectorAvailable:true,token:'synthetic-test-token'});
 await deliver(runtime,{kind:'harmonia:auto-settings'});
 assert.deepEqual(runtime.store.harmoniaPendingEvents,[safe]);
 assert.deepEqual(runtime.store.harmoniaLegacyTemporalQuarantine,[legacyCycle,legacyStop]);
 assert.equal(runtime.postedEvents.some(event=>event.eventId===legacyCycle.eventId||event.eventId===legacyStop.eventId),false);
 assert.deepEqual(runtime.store.harmoniaLegacyTemporalQuarantine[0],legacyCycle);
 assert.deepEqual(runtime.store.harmoniaLegacyTemporalQuarantine[1],legacyStop);
});

test('when the quarantine write fails, the original outbox remains and no event is transmitted',async()=>{
 const legacy={
  schema:'harmonia.event.v1',eventId:'123e4567-e89b-42d3-a456-426614174020',
  sessionId:'123e4567-e89b-42d3-a456-426614174021',type:'client.cycle.started',
  source:'cycle-observer',capturedAt:'2026-11-13T20:00:00.000Z',payload:{duration_ms:100}
 };
 const originalSet=Object.assign;
 const initial={harmoniaPendingEvents:[legacy]};
 const runtime=mockRuntime({initialStorage:initial});
 const local=runtime.context.chrome.storage.local;
 const realSet=local.set;
 local.set=async values=>{
  if(Object.prototype.hasOwnProperty.call(values,'harmoniaLegacyTemporalQuarantine'))throw new Error('synthetic-quarantine-write-failure');
  return realSet(values);
 };
 await deliver(runtime,{kind:'harmonia:auto-settings'});
 assert.deepEqual(runtime.store.harmoniaPendingEvents,[legacy]);
 assert.equal(runtime.store.harmoniaLegacyTemporalQuarantine,undefined);
 assert.equal(runtime.postedEvents.length,0);
 const state=await deliver(runtime,{kind:'harmonia:get'});
 assert.equal(state.ok,true);
 assert.equal(runtime.postedEvents.length,0);
 assertNoTemporalFields({state:'no temporal result'});
});

test('new cycle events cannot be captured by the current content contract',async()=>{
 const runtime=mockRuntime();
 const tab={id:41,url:'https://chatgpt.com/c/synthetic-conversation'};
 const response=await deliver(runtime,{kind:'harmonia:event',event:{type:'client.cycle.completed',payload:{duration_ms:100}}},{tab});
 assert.equal(response.ok,true);
 assert.equal(response.value,false);
 assert.equal((runtime.store.harmoniaPendingEvents||[]).some(event=>event.type==='client.cycle.completed'),false);
});

test('existing ChatGPT tabs receive the activity observer, not the legacy cycle observer',async()=>{
 const tab={id:23,url:'https://chatgpt.com/c/synthetic-conversation'};
 const runtime=mockRuntime({tabsToInject:[tab]});
 await deliver(runtime,{kind:'harmonia:set-auto',enabled:true});
 assert.ok(runtime.injectedScripts.length>=1);
 for(const injection of runtime.injectedScripts){
  assert.deepEqual(Array.from(injection.files),['activity-observer.js','surface-catalog.js','content.js']);
  assert.equal(injection.files.includes('cycle-observer.js'),false);
 }
 assert.equal(runtime.sentMessages.some(entry=>entry.message.kind==='harmonia:start'),true);
 assert.equal(runtime.sentMessages.some(entry=>String(entry.message.kind).includes('cycle')),false);
});

test('sanitized activity state summary never surfaces legacy cycle aggregates',async()=>{
 const runtime=mockRuntime();
 const tab={id:51,url:'https://chatgpt.com/c/synthetic-conversation'};
 await deliver(runtime,{kind:'harmonia:event',event:{type:'ui.activity.state',payload:activityPayload('INACTIVE','INITIALIZED')}},{tab});
 const state=await deliver(runtime,{kind:'harmonia:get'});
 assert.equal(state.ok,true);
 assert.equal(state.value.activity.totalCount,1);
 assert.equal(state.value.activity.inactiveStates,1);
 assert.equal('cycles' in state.value,false);
 assert.equal('cycleDiagnostics' in state.value,false);
 assertNoTemporalFields(state.value);
});
