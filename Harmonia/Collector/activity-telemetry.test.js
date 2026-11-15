'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
 ACTIVITY_EVENT,ACTIVITY_DIAGNOSTIC_EVENT,sanitizeActivityPayload,sanitizeActivityDiagnosticPayload,
 sanitizeActivityEvent,summarizeActivityEvents,summarizeActivityDiagnostics
}=require('./activity-telemetry');

const eventId='123e4567-e89b-42d3-a456-426614174000';
const sessionId='123e4567-e89b-42d3-a456-426614174001';
const capturedAt='2026-11-13T20:30:00.000Z';
const activityPayload={
 state:'ACTIVE',transition:'ACTIVATED',signal_ids:['aria-busy'],main_present:true,
 main_candidate_count:1,user_message_count:2,assistant_message_count:1
};
function event(type=ACTIVITY_EVENT,payload=activityPayload){
 return {schema:'harmonia.event.v1',eventId,sessionId,type,source:'activity-observer',capturedAt,payload};
}

test('activity events accept only structural state and role counts',()=>{
 const clean=sanitizeActivityEvent(event());
 assert.equal(clean.type,ACTIVITY_EVENT);
 assert.deepEqual(clean.payload,activityPayload);
 assert.equal('conversation' in clean,false);
});
test('activity payload rejects all temporal fields and unknown properties',()=>{
 assert.throws(()=>sanitizeActivityPayload({...activityPayload,duration_ms:25}),/fields-invalid/);
 assert.throws(()=>sanitizeActivityPayload({...activityPayload,elapsed_ms:25}),/fields-invalid/);
 assert.throws(()=>sanitizeActivityPayload({...activityPayload,monotonic_ms:25}),/fields-invalid/);
 assert.throws(()=>sanitizeActivityPayload({...activityPayload,extra:'x'}),/fields-invalid/);
});
test('collector explicitly rejects legacy temporal cycle event types',()=>{
 assert.throws(()=>sanitizeActivityEvent(event('client.cycle.completed',{})),/temporal-event-disabled-by-metacanon-52/);
 assert.throws(()=>sanitizeActivityEvent(event('diag.cycle.trace',{})),/temporal-event-disabled-by-metacanon-52/);
});
test('activity diagnostics reject elapsed and timing data',()=>{
 const payload={sequence:1,stage:'activity_transition',state:'ACTIVE',transition:'ACTIVATED',signal_ids:['aria-busy']};
 assert.deepEqual(sanitizeActivityDiagnosticPayload(payload),payload);
 assert.throws(()=>sanitizeActivityDiagnosticPayload({...payload,elapsed_ms:4}),/unapproved-fields/);
 assert.throws(()=>sanitizeActivityDiagnosticPayload({...payload,durationMs:4}),/unapproved-fields/);
});
test('activity event summary reports transitions and last timestamp without deriving durations',()=>{
 const first=event(ACTIVITY_EVENT,{...activityPayload,transition:'INITIALIZED'});
 const second={...event(),eventId:'123e4567-e89b-42d3-a456-426614174002',capturedAt:'2026-11-13T20:31:00.000Z'};
 const summary=summarizeActivityEvents([first,second]);
 assert.equal(summary.totalCount,2);
 assert.equal(summary.activeStates,2);
 assert.equal(summary.transitions.INITIALIZED,1);
 assert.equal(summary.transitions.ACTIVATED,1);
 assert.equal(summary.lastCapturedAt,'2026-11-13T20:31:00.000Z');
 assert.equal('durationMs' in summary,false);
 assert.equal('meanMs' in summary,false);
});
test('activity diagnostic summary reports stages and latest captured timestamp',()=>{
 const first=event(ACTIVITY_DIAGNOSTIC_EVENT,{sequence:1,stage:'observer_started'});
 const second={...first,eventId:'123e4567-e89b-42d3-a456-426614174002',capturedAt:'2026-11-13T20:31:00.000Z',payload:{sequence:2,stage:'activity_transition'}};
 const summary=summarizeActivityDiagnostics([first,second]);
 assert.equal(summary.totalCount,2);
 assert.equal(summary.byStage.observer_started,1);
 assert.equal(summary.lastStage,'activity_transition');
 assert.equal(summary.lastCapturedAt,second.capturedAt);
});
