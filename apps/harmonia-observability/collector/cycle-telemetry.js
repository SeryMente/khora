'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const START='client.cycle.started',COMPLETE='client.cycle.completed';
const COMMON=['conversation_id','cycle_id','phase','timestamp_utc','monotonic_ms','clock_source','clock_precision_ms','coverage','settle_window_ms'];
const START_KEYS=[...COMMON],COMPLETE_KEYS=[...COMMON,'duration_ms'];
const EVENT_KEYS=['schema','eventId','sessionId','type','source','capturedAt','payload'];
function exactKeys(value,expected,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(label+'_must_be_object');const a=Object.keys(value).sort(),b=[...expected].sort();if(a.length!==b.length||a.some((x,i)=>x!==b[i]))throw new Error(label+'_contains_unapproved_fields');}
function validUtc(v){if(typeof v!=='string')return false;const n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString()===v;}
function sanitizeCycleEvent(event){
 if(!event||typeof event!=='object'||Array.isArray(event))throw new Error('cycle_event_invalid');
 exactKeys(event,EVENT_KEYS,'cycle_event');
 if(event.schema!=='harmonia.event.v1')throw new Error('cycle_schema_invalid');
 if(!UUID.test(event.eventId)||!UUID.test(event.sessionId))throw new Error('cycle_event_identity_invalid');
 if(event.type!==START&&event.type!==COMPLETE)throw new Error('cycle_type_not_allowed');
 if(event.source!=='cycle-observer')throw new Error('cycle_source_invalid');
 if(!validUtc(event.capturedAt))throw new Error('cycle_captured_at_invalid');
 const keys=event.type===START?START_KEYS:COMPLETE_KEYS,p=event.payload;exactKeys(p,keys,'cycle_payload');
 if(!UUID_V7.test(p.conversation_id)||!UUID_V7.test(p.cycle_id))throw new Error('cycle_local_identity_must_be_uuidv7');
 if(p.phase!==(event.type===START?'started':'completed'))throw new Error('cycle_phase_mismatch');
 if(!validUtc(p.timestamp_utc)||p.timestamp_utc!==event.capturedAt)throw new Error('cycle_timestamp_mismatch');
 if(!Number.isFinite(p.monotonic_ms)||p.monotonic_ms<0)throw new Error('cycle_monotonic_invalid');
 if(p.clock_source!=='performance.now')throw new Error('cycle_clock_source_invalid');
 if(!Number.isFinite(p.clock_precision_ms)||p.clock_precision_ms<=0||p.clock_precision_ms>1000)throw new Error('cycle_clock_precision_invalid');
 if(p.coverage!=='new-dom-node-v1')throw new Error('cycle_coverage_invalid');
 if(p.settle_window_ms!==1500)throw new Error('cycle_settle_window_invalid');
 if(event.type===COMPLETE&&(!Number.isFinite(p.duration_ms)||p.duration_ms<0))throw new Error('cycle_duration_invalid');
 return {schema:'harmonia.event.v1',eventId:event.eventId,sessionId:event.sessionId,type:event.type,source:'cycle-observer',capturedAt:event.capturedAt,payload:Object.fromEntries(keys.map(k=>[k,p[k]]))};
}
function validateCyclePair(start,complete){
 if(!start||!complete||start.type!==START||complete.type!==COMPLETE)throw new Error('cycle_pair_phase_invalid');
 const a=start.payload,b=complete.payload;
 if(start.sessionId!==complete.sessionId||a.conversation_id!==b.conversation_id||a.cycle_id!==b.cycle_id)throw new Error('cycle_pair_identity_mismatch');
 if(a.clock_source!==b.clock_source||a.clock_precision_ms!==b.clock_precision_ms||a.settle_window_ms!==b.settle_window_ms)throw new Error('cycle_pair_clock_mismatch');
 const delta=b.monotonic_ms-a.monotonic_ms;if(delta<0||!Number.isFinite(delta)||Math.abs(delta-b.duration_ms)>0.001)throw new Error('cycle_duration_does_not_match_monotonic_clock');return true;
}
module.exports={START,COMPLETE,UUID,UUID_V7,sanitizeCycleEvent,validateCyclePair};