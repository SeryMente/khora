'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeCycles } = require('./cycle-telemetry');

const conversation = '018bcfe5-6800-7000-8000-000000000001';
const session = '123e4567-e89b-42d3-a456-426614174000';
const legacyStart = at => ({
  sessionId: session, conversationId: conversation, startedAt: at, monotonicMs: 100,
  clockSource: 'performance.now', clockPrecisionMs: 0.001, settleWindowMs: 1500, coverage: 'new-dom-node-v1'
});
const uiStart = at => ({
  ...legacyStart(at), coverage: 'chatgpt-ui-activity-state-v1',
  metric: 'chatgpt-ui-generation.v1', measurementMethod: 'ui-activity-transition-v1',
  platformAdapter: 'chatgpt-web-free', frameworkRevision: 'HARMONIA-v0.50+DUG-v388-NX-388m'
});
const complete = (at, mono, duration) => ({ sessionId: session, completedAt: at, monotonicMs: mono, durationMs: duration });

test('synthetic: primary statistics include only new graphical ChatGPT generation cycles', () => {
  const cycles = {
    ui1: { state: 'COMPLETED', start: uiStart('2026-11-10T17:00:00.000Z'), complete: complete('2026-11-10T17:00:02.000Z', 2100, 2000) },
    ui2: { state: 'COMPLETED', start: { ...uiStart('2026-11-10T17:01:00.000Z'), monotonicMs: 200 }, complete: complete('2026-11-10T17:01:04.000Z', 4200, 4000) },
    legacy: { state: 'COMPLETED', start: legacyStart('2026-11-10T17:01:30.000Z'), complete: complete('2026-11-10T17:01:33.000Z', 3100, 3000) },
    active: { state: 'STARTED', start: uiStart('2026-11-10T17:02:00.000Z') }
  };
  const stats = summarizeCycles(cycles, 20);
  assert.equal(stats.schema, 'harmonia.cycles.v2');
  assert.equal(stats.metric, 'chatgpt-ui-generation.v1');
  assert.equal(stats.totalCount, 4);
  assert.equal(stats.completedCount, 3);
  assert.equal(stats.measuredCount, 2);
  assert.equal(stats.legacyMeasuredCount, 1);
  assert.equal(stats.activeCount, 1);
  assert.equal(stats.unmeasuredCount, 0);
  assert.equal(stats.medianMs, 3000);
  assert.equal(stats.p90Ms, 4000);
  assert.equal(stats.meanMs, 3000);
  assert.equal(stats.legacyMedianMs, 3000);
  assert.equal(stats.records.find(record => record.cycleId === 'legacy').status, 'LEGACY_MEASURED');
});

test('synthetic: incomplete cycles never receive a duration', () => {
  const stats = summarizeCycles({ active: { state: 'STARTED', start: uiStart('2026-11-10T17:00:00.000Z') } });
  assert.equal(stats.records[0].status, 'INCOMPLETE');
  assert.equal(stats.records[0].durationMs, null);
  assert.equal(stats.medianMs, null);
  assert.equal(stats.p90Ms, null);
});

test('synthetic: legacy persisted events remain readable but never enter the new KPI', () => {
  const payload = {
    conversation_id: conversation, timestamp_utc: '2026-11-10T17:00:00.000Z', monotonic_ms: 100,
    clock_source: 'performance.now', clock_precision_ms: 0.001, settle_window_ms: 1500,
    coverage: 'new-dom-node-v1'
  };
  const cycles = {
    legacy: {
      state: 'COMPLETED',
      start: { sessionId: session, startedAt: payload.timestamp_utc, clockSource: payload.clock_source, coverage: payload.coverage, payload },
      complete: { sessionId: session, completedAt: '2026-11-10T17:00:03.000Z', durationMs: 3000 }
    }
  };
  const stats = summarizeCycles(cycles);
  assert.equal(stats.measuredCount, 0);
  assert.equal(stats.legacyMeasuredCount, 1);
  assert.equal(stats.medianMs, null);
  assert.equal(stats.legacyMedianMs, 3000);
});

const { sanitizeCycleDiagnosticEvent, DIAGNOSTIC_TRACE } = require('./cycle-telemetry');
const diagnosticEvent = (payload = {}) => ({
  schema:'harmonia.event.v1',
  eventId:'123e4567-e89b-42d3-a456-426614174010',
  sessionId:session,
  type:DIAGNOSTIC_TRACE,
  source:'cycle-observer-diagnostic',
  capturedAt:'2026-11-11T20:00:00.000Z',
  payload:{
    sequence:1,stage:'signal_state',elapsed_ms:100,activity:true,
    signals:[
      {id:'aria-busy',matching_count:1,excluded_count:0,visible_count:1},
      {id:'data-is-streaming',matching_count:0,excluded_count:0,visible_count:0},
      {id:'stop-control',matching_count:1,excluded_count:1,visible_count:0},
      {id:'agent-progress',matching_count:0,excluded_count:0,visible_count:0}
    ],
    ...payload
  }
});

test('synthetic: cycle diagnostic trace is strictly sanitized and bounded', () => {
  const clean = sanitizeCycleDiagnosticEvent(diagnosticEvent());
  assert.equal(clean.type,DIAGNOSTIC_TRACE);
  assert.equal(clean.payload.signals.length,4);
  assert.equal(clean.payload.signals[2].excluded_count,1);
  assert.equal('conversation_id' in clean.payload,false);
  assert.equal('cycle_id' in clean.payload,false);
  assert.equal('tabId' in clean.payload,false);
  assert.equal('sessionId' in clean.payload,false);
});

test('synthetic: cycle diagnostic trace rejects content, free strings and unknown fields', () => {
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({prompt:'private text'})),/unapproved_fields/);
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({reason:'assistant said hello'})),/enum_invalid/);
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({stage:'arbitrary-stage'})),/stage_invalid/);
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({sequence:97})),/sequence_invalid/);
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({signals:[{id:'aria-busy',matching_count:0,excluded_count:0,visible_count:0,selector:'body'}]})),/signal/);
});

test('synthetic: cycle diagnostic signal counts cannot exceed or contradict matches', () => {
  assert.throws(() => sanitizeCycleDiagnosticEvent(diagnosticEvent({
    signals:[{id:'aria-busy',matching_count:1,excluded_count:2,visible_count:0}]
  })),/signal_count/);
});
