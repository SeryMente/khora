'use strict';

const ACTIVITY_EVENT='ui.activity.state';
const ACTIVITY_DIAGNOSTIC_EVENT='diag.activity.trace';
const SIGNALS=new Set(['aria-busy','data-is-streaming','stop-control','agent-progress']);
const STAGES=new Set(['observer_started','main_state','signal_state','activity_transition','worker_ack']);
const TEMPORAL_KEYS=new Set([
 'durationMs','duration_ms','legacyDurationMs','legacy_duration_ms',
 'monotonic_ms','monotonicMs','elapsed_ms','elapsedMs',
 'clock_precision_ms','clockPrecisionMs','settle_window_ms','settleWindowMs',
 'meanMs','medianMs','p90Ms','legacyMedianMs','legacyP90Ms',
 'latency','latencyMs','waitMs','processingDuration','processing_ms'
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_KEYS=['schema','eventId','sessionId','type','source','capturedAt','payload'];

function fail(code,statusCode=400){const error=new Error(code);error.code=code;error.statusCode=statusCode;throw error;}
function exactKeys(value,keys,code){
 if(!value||typeof value!=='object'||Array.isArray(value))fail(code);
 const actual=Object.keys(value).sort(),expected=[...keys].sort();
 if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))fail(code);
}
function ensureNoTemporalKeys(value,path='payload'){
 if(Array.isArray(value)){for(let i=0;i<value.length;i++)ensureNoTemporalKeys(value[i],path+'['+i+']');return;}
 if(!value||typeof value!=='object')return;
 for(const [key,child] of Object.entries(value)){
  if(TEMPORAL_KEYS.has(key))fail('temporal-field-disabled-by-metacanon-52');
  ensureNoTemporalKeys(child,path+'.'+key);
 }
}
function validIsoTimestamp(value){
 if(typeof value!=='string'||! /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/.test(value))return false;
 const parsed=Date.parse(value);
 return Number.isFinite(parsed)&&new Date(parsed).toISOString()===value;
}
function count(value,code){
 if(!Number.isInteger(value)||value<0||value>500)fail(code);
 return value;
}
function sanitizeActivityPayload(payload){
 exactKeys(payload,['state','transition','signal_ids','main_present','main_candidate_count','user_message_count','assistant_message_count'],'activity-payload-fields-invalid');
 if(!['ACTIVE','INACTIVE'].includes(payload.state))fail('activity-state-invalid');
 if(!['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(payload.transition))fail('activity-transition-invalid');
 if(payload.transition==='ACTIVATED'&&payload.state!=='ACTIVE')fail('activity-transition-state-mismatch');
 if(payload.transition==='DEACTIVATED'&&payload.state!=='INACTIVE')fail('activity-transition-state-mismatch');
 if(typeof payload.main_present!=='boolean')fail('activity-main-present-invalid');
 if(!Array.isArray(payload.signal_ids)||payload.signal_ids.length>4)fail('activity-signals-invalid');
 const seen=new Set();
 for(const signal of payload.signal_ids){if(!SIGNALS.has(signal)||seen.has(signal))fail('activity-signals-invalid');seen.add(signal);}
 return {
  state:payload.state,transition:payload.transition,signal_ids:[...payload.signal_ids].sort(),
  main_present:payload.main_present,
  main_candidate_count:count(payload.main_candidate_count,'activity-main-count-invalid'),
  user_message_count:count(payload.user_message_count,'activity-user-count-invalid'),
  assistant_message_count:count(payload.assistant_message_count,'activity-assistant-count-invalid')
 };
}
function sanitizeActivityDiagnosticPayload(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))fail('activity-diagnostic-invalid');
 const allowed=['sequence','stage','main_present','main_candidate_count','state','signal_ids','transition','user_message_count','assistant_message_count','sink_result'];
 if(Object.keys(payload).some(key=>!allowed.includes(key)))fail('activity-diagnostic-unapproved-fields');
 if(!Number.isInteger(payload.sequence)||payload.sequence<1||payload.sequence>96)fail('activity-diagnostic-sequence-invalid');
 if(!STAGES.has(payload.stage))fail('activity-diagnostic-stage-invalid');
 const result={sequence:payload.sequence,stage:payload.stage};
 if('main_present' in payload){if(typeof payload.main_present!=='boolean')fail('activity-diagnostic-main-invalid');result.main_present=payload.main_present;}
 for(const key of ['main_candidate_count','user_message_count','assistant_message_count']){
  if(key in payload)result[key]=count(payload[key],'activity-diagnostic-count-invalid');
 }
 if('state' in payload){if(!['ACTIVE','INACTIVE'].includes(payload.state))fail('activity-diagnostic-state-invalid');result.state=payload.state;}
 if('transition' in payload){if(!['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(payload.transition))fail('activity-diagnostic-transition-invalid');result.transition=payload.transition;}
 if('sink_result' in payload){if(!['accepted','rejected','error'].includes(payload.sink_result))fail('activity-diagnostic-sink-invalid');result.sink_result=payload.sink_result;}
 if('signal_ids' in payload){
  if(!Array.isArray(payload.signal_ids)||payload.signal_ids.length>4||payload.signal_ids.some(signal=>!SIGNALS.has(signal))||new Set(payload.signal_ids).size!==payload.signal_ids.length)fail('activity-diagnostic-signals-invalid');
  result.signal_ids=[...payload.signal_ids].sort();
 }
 return result;
}
function sanitizeActivityEvent(event){
 if(!event||typeof event!=='object'||Array.isArray(event))fail('activity-event-invalid');
 if(event.type==='client.cycle.started'||event.type==='client.cycle.completed'||event.type==='diag.cycle.trace')fail('temporal-event-disabled-by-metacanon-52',410);
 if(event.type!==ACTIVITY_EVENT&&event.type!==ACTIVITY_DIAGNOSTIC_EVENT)fail('activity-event-type-out-of-scope');
 if(!validIsoTimestamp(event.capturedAt))fail('activity-event-timestamp-invalid');
 if(!UUID.test(String(event.eventId||''))||!UUID.test(String(event.sessionId||'')))fail('activity-event-identity-invalid');
 if(event.schema!=='harmonia.event.v1')fail('activity-event-schema-invalid');
 ensureNoTemporalKeys(event);
 exactKeys(event,EVENT_KEYS,'activity-event-fields-invalid');
 const source=typeof event.source==='string'?event.source:'';
 if(!/^[a-z0-9-]{1,48}$/i.test(source))fail('activity-event-source-invalid');
 return {
  schema:'harmonia.event.v1',
  eventId:event.eventId,
  sessionId:event.sessionId,
  type:event.type,
  source,
  capturedAt:event.capturedAt,
  payload:event.type===ACTIVITY_EVENT?sanitizeActivityPayload(event.payload):sanitizeActivityDiagnosticPayload(event.payload)
 };
}
function summarizeActivityEvents(records){
 const events=Array.isArray(records)?records.filter(item=>item&&item.type===ACTIVITY_EVENT):[];
 const transitions={INITIALIZED:0,ACTIVATED:0,DEACTIVATED:0};
 const states={ACTIVE:0,INACTIVE:0};
 for(const event of events){
  if(Object.prototype.hasOwnProperty.call(transitions,event.payload?.transition))transitions[event.payload.transition]++;
  if(Object.prototype.hasOwnProperty.call(states,event.payload?.state))states[event.payload.state]++;
 }
 const latest=[...events].sort((a,b)=>String(b.capturedAt||'').localeCompare(String(a.capturedAt||'')))[0];
 return {
  schema:'harmonia.activity-summary.v1',totalCount:events.length,
  activeStates:states.ACTIVE,inactiveStates:states.INACTIVE,transitions,
  lastState:['ACTIVE','INACTIVE'].includes(latest?.payload?.state)?latest.payload.state:null,
  lastTransition:['INITIALIZED','ACTIVATED','DEACTIVATED'].includes(latest?.payload?.transition)?latest.payload.transition:null,
  lastCapturedAt:latest?.capturedAt||null
 };
}
function summarizeActivityDiagnostics(records){
 const events=Array.isArray(records)?records.filter(item=>item&&item.type===ACTIVITY_DIAGNOSTIC_EVENT):[];
 const byStage={};
 for(const event of events){const stage=event.payload?.stage;if(STAGES.has(stage))byStage[stage]=(byStage[stage]||0)+1;}
 const latest=[...events].sort((a,b)=>String(b.capturedAt||'').localeCompare(String(a.capturedAt||'')))[0];
 return {schema:'harmonia.activity-diagnostics-summary.v1',totalCount:events.length,byStage,lastStage:latest?.payload?.stage||null,lastCapturedAt:latest?.capturedAt||null};
}
module.exports={
 ACTIVITY_EVENT,ACTIVITY_DIAGNOSTIC_EVENT,SIGNALS,TEMPORAL_KEYS,
 sanitizeActivityPayload,sanitizeActivityDiagnosticPayload,sanitizeActivityEvent,
 summarizeActivityEvents,summarizeActivityDiagnostics,ensureNoTemporalKeys
};
