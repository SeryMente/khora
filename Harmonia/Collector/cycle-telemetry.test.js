'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const telemetry=require('./cycle-telemetry');

test('legacy cycle telemetry API is disabled by the current Metacanon temporal rule',()=>{
 assert.equal(telemetry.DISABLED_REASON,'temporal-cycle-telemetry-disabled-by-metacanon-52');
 for(const name of ['sanitizeCycleEvent','sanitizeCycleDiagnosticEvent','validateCyclePair','summarizeCycles']){
  assert.throws(()=>telemetry[name]({}),error=>error.code===telemetry.DISABLED_REASON&&error.statusCode===410,name);
 }
});
test('legacy event type constants remain identifiers only and cannot be aggregated',()=>{
 assert.equal(telemetry.START,'client.cycle.started');
 assert.equal(telemetry.COMPLETE,'client.cycle.completed');
 assert.equal(telemetry.DIAGNOSTIC_TRACE,'diag.cycle.trace');
 assert.throws(()=>telemetry.summarizeCycles({}),/disabled-by-metacanon-52/);
});
