'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createCycleObserver, uuidv7, UUID_V7, COVERAGE, METRIC } = require('./cycle-observer');

function harness(initial = []) {
  let now = 100, next = 1, random = 0, callback = null;
  const timers = new Map(), events = [], observed = [], diagnosticEvents = [];
  const snapshot = { messages: [...initial], activity: false, signalIds: [], mainPresent:true, mainCandidateCount:1,
    signalPresence:{'aria-busy':{matchingCount:0,excludedCount:0,visibleCount:0},'data-is-streaming':{matchingCount:0,excludedCount:0,visibleCount:0},'stop-control':{matchingCount:0,excludedCount:0,visibleCount:0},'agent-progress':{matchingCount:0,excludedCount:0,visibleCount:0}} };
  const performanceRef = { timeOrigin: 1700000000000, now: () => now };
  const cryptoRef = {
    getRandomValues(bytes) {
      random += 1; bytes.fill(0);
      let value = BigInt(random);
      for (let i = bytes.length - 1; i >= 9; i -= 1) { bytes[i] = Number(value & 255n); value >>= 8n; }
      return bytes;
    }
  };
  class FakeMutationObserver {
    constructor(fn) { callback = fn; }
    observe(target, config) { observed.push({ target, config }); }
    disconnect() {}
  }
  const observer = createCycleObserver({
    target: {},
    getSnapshot: () => snapshot,
    performanceRef,
    cryptoRef,
    MutationObserverCtor: FakeMutationObserver,
    setTimeoutFn(fn, delay) { const id = next++; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeoutFn(id) { timers.delete(id); },
    onEvent(type, payload) { events.push({ type, payload }); },
    onDiagnostic(payload) { diagnosticEvents.push(payload); }
  });
  function refresh() { if (callback) callback([]); }
  function advance(ms) {
    const target = now + ms;
    while (true) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due; timers.delete(id); now = timer.at; timer.fn();
    }
    now = target;
  }
  function start() {
    snapshot.messages.push(message('user')); refresh();
    assert.equal(events.length, 0, 'the user DOM node alone must not start the KPI');
    snapshot.activity = true; snapshot.signalIds = ['stop-control'];
    snapshot.signalPresence['stop-control']={matchingCount:1,excludedCount:0,visibleCount:1};
    refresh();
    return events.find(event => event.type === 'client.cycle.started');
  }
  return { observer, snapshot, events, observed, diagnosticEvents, refresh, advance, now: () => now, start };
}
function node() { return { childNodes: [{}] }; }
function message(role, element = node()) { return { role, node: element }; }

test('synthetic: existing baseline does not create cycles', () => {
  const h = harness([message('user'), message('assistant')]);
  h.refresh(); h.advance(3000);
  assert.equal(h.events.length, 0);
});

test('synthetic: user DOM node does not start; visible processing transition emits T1', () => {
  const h = harness();
  h.snapshot.messages.push(message('user')); h.refresh();
  assert.equal(h.events.length, 0);
  h.snapshot.activity = true; h.snapshot.signalIds = ['aria-busy', 'stop-control']; h.refresh();
  const start = h.events.find(event => event.type === 'client.cycle.started');
  assert.ok(start);
  assert.equal(start.payload.metric, METRIC);
  assert.equal(start.payload.coverage, COVERAGE);
  assert.equal(start.payload.phase, 'started');
  assert.deepEqual(start.payload.start_signal_ids, ['aria-busy', 'stop-control']);
  assert.equal(start.payload.monotonic_ms, h.now());
});

test('synthetic: observer diagnostics account for user, T1, T2 and event sink outcomes', () => {
  const h = harness();
  h.start();
  let state = h.observer.getState();
  assert.equal(state.diagnostics.userTurnNodesObserved, 1);
  assert.equal(state.diagnostics.activityRisingEdges, 1);
  assert.equal(state.diagnostics.cycleStartAttempts, 1);
  assert.equal(state.diagnostics.cycleStartedEvents, 1);
  assert.equal(state.diagnostics.eventSinkAttempts, 1);
  assert.equal(state.diagnostics.eventSinkAccepted, 1);
  h.snapshot.messages.push(message('assistant')); h.refresh();
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  h.advance(1500);
  state = h.observer.getState();
  assert.equal(state.diagnostics.activityFallingEdges, 1);
  assert.equal(state.diagnostics.cycleCompletedEvents, 1);
  assert.equal(state.diagnostics.eventSinkAttempts, 2);
  assert.equal(state.diagnostics.eventSinkAccepted, 2);
  assert.equal(state.diagnostics.lastDecision, 'cycle-completed-event-emitted');
});

test('synthetic: diagnostics expose rejection when the processing edge has no allowlisted signal', () => {
  const h = harness();
  h.snapshot.messages.push(message('user')); h.refresh();
  h.snapshot.activity = true; h.snapshot.signalIds = ['unapproved-signal']; h.refresh();
  const state = h.observer.getState();
  assert.equal(state.diagnostics.cycleStartAttempts, 1);
  assert.equal(state.diagnostics.cycleStartRejectedNoSignals, 1);
  assert.equal(state.diagnostics.cycleStartedEvents, 0);
  assert.equal(state.diagnostics.lastDecision, 'cycle-start-rejected-no-allowed-signal');
});
test('synthetic: repeated active mutations do not duplicate T1', () => {
  const h = harness(); h.start();
  h.refresh(); h.advance(250); h.refresh();
  assert.equal(h.events.filter(event => event.type === 'client.cycle.started').length, 1);
});

test('synthetic: assistant and inactive UI state are both required for T2', () => {
  const h = harness(); h.start();
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  const t2 = h.now();
  h.advance(2000);
  assert.equal(h.events.filter(event => event.type === 'client.cycle.completed').length, 0);
  h.snapshot.messages.push(message('assistant')); h.refresh();
  h.advance(0);
  const completed = h.events.find(event => event.type === 'client.cycle.completed');
  assert.ok(completed);
  assert.equal(completed.payload.monotonic_ms, t2);
});

test('synthetic: T2 is the first inactive transition, not the settle timer or later rendering mutation', () => {
  const h = harness(); const start = h.start();
  h.snapshot.messages.push(message('assistant'));
  h.advance(100);
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  const t2 = h.now();
  h.advance(600); h.refresh();
  h.advance(900);
  const complete = h.events.find(event => event.type === 'client.cycle.completed');
  assert.ok(complete);
  assert.equal(complete.payload.monotonic_ms, t2);
  assert.equal(complete.payload.duration_ms, t2 - start.payload.monotonic_ms);
  assert.equal(complete.payload.end_signal_id, 'processing-indicators-cleared');
});

test('synthetic: active signal returning during settle cancels the pending completion', () => {
  const h = harness(); h.start();
  h.snapshot.messages.push(message('assistant'));
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  h.advance(900);
  h.snapshot.activity = true; h.snapshot.signalIds = ['agent-progress']; h.refresh();
  h.advance(2000);
  assert.equal(h.events.filter(event => event.type === 'client.cycle.completed').length, 0);
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  h.advance(1500);
  assert.equal(h.events.filter(event => event.type === 'client.cycle.completed').length, 1);
});

test('synthetic: second user turn leaves first incomplete and waits for a fresh processing edge', () => {
  const h = harness(); h.start();
  h.snapshot.messages.push(message('assistant')); h.refresh();
  h.snapshot.messages.push(message('user')); h.refresh();
  assert.equal(h.events.filter(event => event.type === 'client.cycle.started').length, 1);
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  h.snapshot.activity = true; h.snapshot.signalIds = ['data-is-streaming']; h.refresh();
  assert.equal(h.events.filter(event => event.type === 'client.cycle.started').length, 2);
  h.snapshot.messages.push(message('assistant')); h.refresh();
  h.snapshot.activity = false; h.snapshot.signalIds = []; h.refresh();
  h.advance(1500);
  assert.equal(h.events.filter(event => event.type === 'client.cycle.completed').length, 1);
});

test('synthetic: processing indicator may precede the user DOM node and still preserve the true T1', () => {
  const h = harness();
  h.snapshot.activity = true;
  h.snapshot.signalIds = ['stop-control'];
  h.refresh();
  assert.equal(h.events.length, 0, 'do not create a cycle without a user turn');
  const actualT1 = h.now();
  h.advance(140);
  h.snapshot.messages.push(message('user'));
  h.refresh();
  const start = h.events.find(event => event.type === 'client.cycle.started');
  assert.ok(start, 'the delayed user node should correlate to the recent activity edge');
  assert.equal(start.payload.monotonic_ms, actualT1, 'T1 must remain the original processing edge, not the later DOM attachment');
  assert.deepEqual(start.payload.start_signal_ids, ['stop-control']);
});

test('synthetic: stale unmatched processing edge is not attached to a much later user turn', () => {
  const h = harness();
  h.snapshot.activity = true;
  h.snapshot.signalIds = ['stop-control'];
  h.refresh();
  h.advance(2501);
  h.snapshot.messages.push(message('user'));
  h.refresh();
  assert.equal(h.events.filter(event => event.type === 'client.cycle.started').length, 0);
  assert.equal(h.observer.getState().diagnostics.staleActivityEdges, 1);
  h.snapshot.activity = false;
  h.snapshot.signalIds = [];
  h.refresh();
  h.snapshot.activity = true;
  h.snapshot.signalIds = ['aria-busy'];
  h.refresh();
  const start = h.events.find(event => event.type === 'client.cycle.started');
  assert.ok(start);
  assert.equal(start.payload.monotonic_ms, h.now());
  assert.deepEqual(start.payload.start_signal_ids, ['aria-busy']);
});

test('synthetic: reconstruction is not a new cycle', () => {
  const h = harness([message('user'), message('assistant')]);
  h.snapshot.messages = [message('user'), message('assistant'), message('user')];
  h.refresh();
  assert.equal(h.events.length, 0);
});

test('synthetic: stop does not fabricate T2', () => {
  const h = harness(); h.start();
  h.snapshot.messages.push(message('assistant'));
  h.observer.stop(); h.snapshot.activity = false; h.refresh(); h.advance(3000);
  assert.equal(h.events.filter(event => event.type === 'client.cycle.completed').length, 0);
});

test('synthetic: UUIDv7 version, variant and 1000 unique IDs', () => {
  let seed = 0;
  const cryptoRef = { getRandomValues(bytes) { seed += 1; bytes.fill(0); let value = BigInt(seed); for (let i = bytes.length - 1; i >= 9; i -= 1) { bytes[i] = Number(value & 255n); value >>= 8n; } return bytes; } };
  const ids = Array.from({ length: 1000 }, () => uuidv7(1700000000000, cryptoRef));
  assert.ok(ids.every(id => UUID_V7.test(id)));
  assert.equal(new Set(ids).size, 1000);
});

test('synthetic: content observer uses collection queries and stable document roots', () => {
  const source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  const candidates = source.split('\n').map(line => line.replaceAll('$$(', ''));
  const collectionMethods = ['.filter(', '.map(', '.some(', '.length', '.slice(', '.forEach('];
  const invalid = candidates.filter(line => line.includes('$(') && collectionMethods.some(method => line.includes(method)));
  assert.deepEqual(invalid, [], 'querySelector results must not be used as arrays');
  assert.ok(source.includes('const messages=$$('), 'cycle snapshots must enumerate message nodes');
  assert.ok(source.includes('const root=document.body||document.documentElement;'), 'observation must survive late mounting/replacement of <main>');
});
test('synthetic: observes aria-label transitions used by stop-control T1/T2 signals', () => {
  const h = harness();
  assert.ok(h.observed[0].config.attributeFilter.includes('aria-label'));
  assert.ok(h.observed[0].config.attributeFilter.includes('aria-busy'));
  assert.ok(h.observed[0].config.attributeFilter.includes('data-is-streaming'));
});

test('synthetic: observer does not read or retain message text', () => {
  const h = harness(), config = h.observed[0].config;
  assert.equal(config.characterData, true);
  assert.equal('characterDataOldValue' in config, false);
  const source = fs.readFileSync(path.join(__dirname, 'cycle-observer.js'), 'utf8');
  for (const token of ['textContent', 'innerText', 'innerHTML', 'outerHTML', 'nodeValue', '.value']) assert.equal(source.includes(token), false);
});

test('synthetic: discrete cycle diagnostic stages expose main, signals, correlation, decision and worker delivery only', () => {
  const h = harness();
  const start = h.start();
  h.snapshot.messages.push(message('assistant'));
  h.snapshot.activity = false; h.snapshot.signalIds = [];
  h.snapshot.signalPresence['stop-control']={matchingCount:1,excludedCount:1,visibleCount:0};
  h.refresh();
  h.advance(1500);
  const stages=h.diagnosticEvents.map(item=>item.stage);
  for(const stage of ['observer_started','main_state','signal_state','user_turn_observed','activity_edge','correlation','cycle_decision','cycle_wait','worker_ack']) {
    assert.ok(stages.includes(stage), 'missing diagnostic stage '+stage);
  }
  const signals=h.diagnosticEvents.filter(item=>item.stage==='signal_state').flatMap(item=>item.signals||[]);
  assert.ok(signals.some(item=>item.id==='stop-control'&&item.matching_count===1&&item.visible_count===1));
  const decisions=h.diagnosticEvents.filter(item=>item.stage==='cycle_decision');
  assert.deepEqual(decisions.map(item=>item.decision),['started','completed']);
  const acks=h.diagnosticEvents.filter(item=>item.stage==='worker_ack');
  assert.deepEqual(acks.map(item=>item.event_phase),['started','completed']);
  assert.ok(start);
});
