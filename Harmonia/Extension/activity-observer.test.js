'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createActivityObserver}=require('./activity-observer');

function harness(initialActive=false){
 let callback=null;
 const events=[];
 const diagnostics=[];
 const snapshot={
  messages:[{role:'user'},{role:'assistant'}],
  activity:initialActive,
  signalIds:initialActive?['aria-busy']:[],
  mainPresent:true,
  mainCandidateCount:1
 };
 class FakeMutationObserver{
  constructor(fn){callback=fn;}
  observe(target,config){this.target=target;this.config=config;}
  disconnect(){this.disconnected=true;}
 }
 const observer=createActivityObserver({
  target:{},
  getSnapshot:()=>snapshot,
  MutationObserverCtor:FakeMutationObserver,
  onEvent(type,payload){events.push({type,payload});return {ok:true};},
  onDiagnostic(payload){diagnostics.push(payload);}
 });
 return {
  observer,events,diagnostics,snapshot,
  reconcile(){callback?.([]);}
 };
}

function assertNoTemporalFields(value){
 const forbidden=/duration|elapsed|latency|monotonic|clock_precision|settle_window|meanMs|medianMs|p90Ms|processing_ms|wait_ms/i;
 const walk=(item)=>{
  if(Array.isArray(item)){for(const child of item)walk(child);return;}
  if(!item||typeof item!=='object')return;
  for(const [key,child] of Object.entries(item)){
   assert.equal(forbidden.test(key),false,'forbidden temporal key: '+key);
   walk(child);
  }
 };
 walk(value);
}

test('initialization records only structural active state, without timing fields',()=>{
 const h=harness(false);
 assert.equal(h.events.length,1);
 assert.equal(h.events[0].type,'ui.activity.state');
 assert.deepEqual(h.events[0].payload,{
  state:'INACTIVE',transition:'INITIALIZED',signal_ids:[],
  main_present:true,main_candidate_count:1,user_message_count:1,assistant_message_count:1
 });
 assertNoTemporalFields(h.events);
 assertNoTemporalFields(h.diagnostics);
 h.observer.stop();
});

test('activity edges emit ACTIVE and INACTIVE state transitions without elapsed values',()=>{
 const h=harness(false);
 h.snapshot.activity=true;
 h.snapshot.signalIds=['aria-busy'];
 h.reconcile();
 h.snapshot.activity=false;
 h.snapshot.signalIds=[];
 h.reconcile();
 assert.deepEqual(h.events.slice(1).map(event=>[event.type,event.payload.state,event.payload.transition]),[
  ['ui.activity.state','ACTIVE','ACTIVATED'],
  ['ui.activity.state','INACTIVE','DEACTIVATED']
 ]);
 assertNoTemporalFields(h.events);
 assertNoTemporalFields(h.diagnostics);
});

test('observer exposes bounded structural diagnostics only',()=>{
 const h=harness(true);
 const state=h.observer.getState();
 assert.equal(state.active,true);
 assert.equal(state.snapshot.mainPresent,true);
 assert.equal(state.snapshot.signalIds[0],'aria-busy');
 assertNoTemporalFields(state);
 h.observer.stop();
 assert.equal(h.observer.getState().stopped,true);
});

test('activity payload does not expose message nodes or conversation content',()=>{
 const h=harness(true);
 const payload=h.events[0].payload;
 assert.equal('messages' in payload,false);
 assert.equal('conversation_id' in payload,false);
 assert.equal('cycle_id' in payload,false);
 assertNoTemporalFields(payload);
 h.observer.stop();
});

test('missing main region is exposed as structural absence, not a timing failure',()=>{
 let callback=null;
 class FakeMutationObserver{constructor(fn){callback=fn;}observe(){}disconnect(){}}
 const observer=createActivityObserver({
  target:{},
  getSnapshot:()=>({messages:[],activity:false,signalIds:[],mainPresent:false,mainCandidateCount:0}),
  MutationObserverCtor:FakeMutationObserver,
  onEvent(){return {ok:true};}
 });
 const state=observer.getState();
 assert.equal(state.snapshot.mainPresent,false);
 assert.equal(state.snapshot.mainCandidateCount,0);
 assert.equal(state.snapshot.userMessageCount,0);
 assert.equal(state.snapshot.assistantMessageCount,0);
 observer.stop();
});

test('empty role counts are accepted without collecting conversation text',()=>{
 const h=harness(false);
 h.snapshot.messages=[];
 h.observer.reconcile();
 const state=h.observer.getState();
 assert.equal(state.snapshot.userMessageCount,0);
 assert.equal(state.snapshot.assistantMessageCount,0);
 assertNoTemporalFields(state);
 h.observer.stop();
});

test('rejected event sink is counted without creating a duration metric',()=>{
 let callback=null;
 const diagnostics=[];
 class FakeMutationObserver{constructor(fn){callback=fn;}observe(){}disconnect(){}}
 const snapshot={messages:[],activity:false,signalIds:[],mainPresent:true,mainCandidateCount:1};
 const observer=createActivityObserver({
  target:{},getSnapshot:()=>snapshot,MutationObserverCtor:FakeMutationObserver,
  onEvent(){return false;},onDiagnostic(payload){diagnostics.push(payload);}
 });
 snapshot.activity=true;snapshot.signalIds=['aria-busy'];callback?.([]);
 const state=observer.getState();
 assert.equal(state.diagnostics.eventSinkRejected,2);
 assert.ok(diagnostics.some(item=>item.stage==='worker_ack'&&item.sink_result==='rejected'));
 assertNoTemporalFields(state);
 assertNoTemporalFields(diagnostics);
 observer.stop();
});
