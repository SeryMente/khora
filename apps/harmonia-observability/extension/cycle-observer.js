(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HarmoniaCycleTelemetry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SETTLE_WINDOW_MS=1500,COVERAGE='new-dom-node-v1';
const UUID_V7=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function uuidv7(nowMs,cryptoRef){
 if(!Number.isFinite(nowMs)||nowMs<0)throw new TypeError('invalid_uuid_timestamp');
 if(!cryptoRef||typeof cryptoRef.getRandomValues!=='function')throw new TypeError('crypto_random_required');
 const bytes=new Uint8Array(16);cryptoRef.getRandomValues(bytes);let timestamp=BigInt(Math.trunc(nowMs));
 for(let i=5;i>=0;i-=1){bytes[i]=Number(timestamp&0xffn);timestamp>>=8n;}
 bytes[6]=(bytes[6]&0x0f)|0x70;bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
function measureClockPrecision(clock){
 let previous=clock.now(),minimum=Infinity;
 for(let i=0;i<200;i+=1){const current=clock.now();if(current>previous)minimum=Math.min(minimum,current-previous);previous=current;}
 return Number.isFinite(minimum)&&minimum>0?minimum:1;
}
function exactTimestamp(clock,mono){return new Date(clock.timeOrigin+mono).toISOString();}
function createCycleObserver(options){
 if(!options||typeof options.getSnapshot!=='function')throw new TypeError('snapshot_provider_required');
 if(!options.target)throw new TypeError('observer_target_required');
 const clock=options.performanceRef||(typeof performance!=='undefined'?performance:null);
 const cryptoRef=options.cryptoRef||(typeof crypto!=='undefined'?crypto:null);
 const Observer=options.MutationObserverCtor||(typeof MutationObserver!=='undefined'?MutationObserver:null);
 const setTimer=options.setTimeoutFn||setTimeout,clearTimer=options.clearTimeoutFn||clearTimeout;
 if(!clock||typeof clock.now!=='function'||!Number.isFinite(clock.timeOrigin))throw new TypeError('monotonic_clock_required');
 if(!Observer)throw new TypeError('mutation_observer_required');
 if(typeof options.onEvent!=='function')throw new TypeError('event_sink_required');
 const conversationId=options.conversationId||uuidv7(Date.now(),cryptoRef);
 if(!UUID_V7.test(conversationId))throw new TypeError('conversation_id_must_be_uuidv7');
 const clockPrecisionMs=measureClockPrecision(clock);
 let baseline=normalizeMessages(options.getSnapshot().messages),active=null,inactiveSince=null,settleTimer=null,stopped=false;
 function normalizeMessages(messages){return Array.isArray(messages)?messages.filter(x=>x&&x.node&&(x.role==='user'||x.role==='assistant')):[];}
 function same(a,b){return a.node===b.node&&a.role===b.role;}
 function isPrefix(previous,current){
  if(previous.length>current.length)return false;
  for(let i=0;i<previous.length;i+=1)if(!same(previous[i],current[i]))return false;
  return true;
 }
 function clearSettle(){if(settleTimer!==null)clearTimer(settleTimer);settleTimer=null;}
 function send(type,payload){
  try{const result=options.onEvent(type,payload);if(result&&typeof result.catch==='function')result.catch(()=>{});}catch(_){}
 }
 function payloadFor(phase,cycle,mono){
  const p={conversation_id:conversationId,cycle_id:cycle.id,phase,timestamp_utc:exactTimestamp(clock,mono),
   monotonic_ms:mono,clock_source:'performance.now',clock_precision_ms:clockPrecisionMs,coverage:COVERAGE,settle_window_ms:SETTLE_WINDOW_MS};
  if(phase==='completed')p.duration_ms=mono-cycle.startedMonotonicMs;
  return p;
 }
 function begin(message,mono){
  clearSettle();inactiveSince=null;
  const cycle={id:uuidv7(Date.now(),cryptoRef),userNode:message.node,startedMonotonicMs:mono};
  active=cycle;send('client.cycle.started',payloadFor('started',cycle,mono));
 }
 function assistantAfter(messages,cycle){
  const index=messages.findIndex(x=>x.node===cycle.userNode&&x.role==='user');
  if(index<0)return false;
  for(let i=index+1;i<messages.length;i+=1){
   const item=messages[i];
   if(item.role==='assistant'&&(!item.node.childNodes||item.node.childNodes.length>0))return true;
  }
  return false;
 }
 function completeIfSettled(){
  settleTimer=null;if(stopped||!active||inactiveSince===null)return;
  const snapshot=options.getSnapshot(),messages=normalizeMessages(snapshot.messages);
  if(!messages.some(x=>x.node===active.userNode&&x.role==='user')){active=null;inactiveSince=null;return;}
  if(snapshot.activity===true||!assistantAfter(messages,active)){inactiveSince=null;return;}
  const cycle=active,finalMono=inactiveSince,duration=finalMono-cycle.startedMonotonicMs;
  active=null;inactiveSince=null;
  if(!Number.isFinite(duration)||duration<0)return;
  send('client.cycle.completed',payloadFor('completed',cycle,finalMono));
 }
 function evaluate(mono,snapshot,mutationObserved){
  if(!active)return;
  const messages=normalizeMessages(snapshot.messages);
  if(!messages.some(x=>x.node===active.userNode&&x.role==='user')){clearSettle();active=null;inactiveSince=null;return;}
  if(!assistantAfter(messages,active)||snapshot.activity===true){clearSettle();inactiveSince=null;return;}
  if(inactiveSince===null||mutationObserved){clearSettle();inactiveSince=mono;settleTimer=setTimer(completeIfSettled,SETTLE_WINDOW_MS);}
 }
 function reconcile(){
  if(stopped)return;
  const mono=clock.now(),snapshot=options.getSnapshot(),current=normalizeMessages(snapshot.messages);
  if(isPrefix(baseline,current)){
   const appended=current.slice(baseline.length);
   for(const item of appended)if(item.role==='user')begin(item,mono);
  }else if(active&&!current.some(x=>x.node===active.userNode)){clearSettle();active=null;inactiveSince=null;}
  baseline=current;evaluate(mono,snapshot,true);
 }
 const mutationObserver=new Observer(reconcile);
 mutationObserver.observe(options.target,{subtree:true,childList:true,attributes:true,
  attributeFilter:['aria-busy','data-is-streaming','data-testid','data-message-author-role','role','aria-live','disabled','data-state','class'],characterData:true});
 return Object.freeze({
  conversationId,clockPrecisionMs,refresh:reconcile,
  stop(){if(stopped)return;stopped=true;clearSettle();mutationObserver.disconnect();active=null;inactiveSince=null;},
  getState(){return {active:!!active,cycleId:active?active.id:null,conversationId,settling:inactiveSince!==null};}
 });
}
return Object.freeze({SETTLE_WINDOW_MS,COVERAGE,UUID_V7,uuidv7,measureClockPrecision,createCycleObserver});
});