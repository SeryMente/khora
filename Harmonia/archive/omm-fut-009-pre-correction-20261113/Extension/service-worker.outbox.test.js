'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function eventSlot() {
  let handler = null;
  return {
    addListener(callback) { handler = callback; },
    get handler() { return handler; }
  };
}
function mockRuntime(options = {}) {
  const store = structuredClone(options.initialStorage || {});
  const onMessage = eventSlot();
  const injectedScripts = [];
  const sentMessages = [];
  const response = (ok, status, body) => ({ ok, status, async json() { return body; } });
  const buildInfo = {
    schema: 'harmonia.repository-build.v1',
    version: '0.4.9',
    sourceRevision: 'LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY',
    catalogVersion: '0.1.3'
  };
  const catalog = { schema: 'harmonia.coverage-catalog.v1', version: '0.1.3', features: [], sources: [] };
  async function fetchStub(url) {
    const value = String(url);
    if (options.blockRepositorySync && value.startsWith('https://raw.githubusercontent.com/')) {
      options.onRepositoryFetch?.(value);
      return new Promise(() => {});
    }
    if (value.startsWith('chrome-extension://')) return response(true, 200, buildInfo);
    if (value.endsWith('/build-info.json')) return response(false, 404, {});
    if (value.endsWith('/coverage-catalog.json')) return response(true, 200, catalog);
    if (value.includes('127.0.0.1:47321')) {
      if (value.endsWith('/health') && options.collectorAvailable) return response(true, 200, { ok: true });
      if ((value.endsWith('/coverage') || value.endsWith('/cycles') || value.endsWith('/cycle-diagnostics')) && options.collectorAvailable) return response(true, 200, {});
      if (value.endsWith('/events') && options.collectorEventError) {
        return response(false, options.collectorEventError.status || 400, { error: options.collectorEventError.code || 'synthetic-rejection' });
      }
      return response(false, 401, {});
    }
    throw new Error('unexpected_fetch_target');
  }
  const chrome = {
    storage: {
      local: {
        async get(keys) {
          if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, store[key]]));
          return { ...store };
        },
        async set(values) { Object.assign(store, structuredClone(values)); }
      }
    },
    tabs: {
      async query() { return options.tabsToInject || []; },
      async sendMessage(tabId, message) { sentMessages.push({ tabId, message }); if(message?.kind==='harmonia:cycle-diagnostics' && options.cycleDiagnostics) return structuredClone(options.cycleDiagnostics); return { ok: true }; },
      onRemoved: eventSlot(),
      onUpdated: eventSlot()
    },
    runtime: {
      getURL(name) { return 'chrome-extension://harmonia/' + name; },
      onMessage,
      onInstalled: eventSlot(),
      onStartup: eventSlot()
    },
    alarms: { create() {}, onAlarm: eventSlot() },
    scripting: { async executeScript(details) { injectedScripts.push(details); } }
  };
  const context = {
    chrome,
    HARMONIA_TOKEN: options.token || '',
    crypto: webcrypto,
    fetch: fetchStub,
    URL,
    TextEncoder,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    Map,
    Set,
    Object,
    Array,
    Number,
    String,
    JSON,
    Error
  };
  context.globalThis = context;
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, 'service-worker.js'), 'utf8'),
    context,
    { filename: 'service-worker.js' }
  );
  return { context, store, injectedScripts, sentMessages, get listener() { return onMessage.handler; } };
}
async function deliver(runtime, message, sender = {}) {
  return new Promise((resolve, reject) => {
    try {
      const keepAlive = runtime.listener(message, sender, resolve);
      if (keepAlive !== true) reject(new Error('message_listener_did_not_keep_async_channel'));
    } catch (error) { reject(error); }
  });
}

test('synthetic: without collector credentials, service worker durably queues metadata-only events and summarizes a graphical cycle', async () => {
  const runtime = mockRuntime();
  const tab = { id: 17, url: 'https://chatgpt.com/c/synthetic-conversation' };
  const frameworkRevision = 'HARMONIA-v0.72+DUG-v388-NX-388m';
  const common = {
    conversation_id: '018bcfe5-6800-7000-8000-000000000001',
    cycle_id: '018bcfe5-6800-7000-8000-000000000002',
    clock_source: 'performance.now',
    clock_precision_ms: 0.01,
    coverage: 'chatgpt-ui-activity-state-v1',
    settle_window_ms: 1500,
    platform_adapter: 'chatgpt-web-free',
    metric: 'chatgpt-ui-generation.v1',
    measurement_method: 'ui-activity-transition-v1',
    start_signal_ids: ['stop-control']
  };
  const startAt = '2026-11-10T20:00:00.100Z';
  const endAt = '2026-11-10T20:00:03.100Z';
  await deliver(runtime, {
    kind: 'harmonia:event',
    event: { type: 'client.cycle.started', payload: { ...common, phase: 'started', timestamp_utc: startAt, monotonic_ms: 100 } }
  }, { tab });
  await deliver(runtime, {
    kind: 'harmonia:event',
    event: { type: 'client.cycle.completed', payload: { ...common, phase: 'completed', timestamp_utc: endAt, monotonic_ms: 3100, end_signal_id: 'processing-indicators-cleared', duration_ms: 3000 } }
  }, { tab });

  const queued = runtime.store.harmoniaPendingEvents;
  assert.ok(Array.isArray(queued));
  assert.equal(queued.length, 3); // capture.started + cycle started + cycle completed
  assert.equal(queued[1].payload.metric, 'chatgpt-ui-generation.v1');
  assert.equal(queued[1].payload.framework_revision, frameworkRevision);
  assert.equal(queued[2].payload.duration_ms, 3000);
  const serialized = JSON.stringify(queued);
  for (const forbidden of ['prompt text', 'assistant answer', 'composer value', 'cookie', 'authorization']) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }

  const stateResponse = await deliver(runtime, { kind: 'harmonia:get' });
  assert.equal(stateResponse.ok, true);
  assert.equal(stateResponse.value.collector, false);
  assert.equal(stateResponse.value.pendingEvents, 3);
  assert.equal(stateResponse.value.cycles.measuredCount, 1);
  assert.equal(stateResponse.value.cycles.medianMs, 3000);
  assert.equal(stateResponse.value.cycles.frameworkRevision, frameworkRevision);
});

test('synthetic: cycle diagnostics aggregate structural counters without exposing tab or conversation identifiers', async () => {
  const cycleDiagnostics = {
    schema: 'harmonia.cycle-observer-diagnostics.v1',
    available: true,
    observer: {
      reconcileCount: 12, lastUserMessageCount: 1, lastAssistantMessageCount: 0,
      userTurnNodesObserved: 1, activityTrueSnapshots: 3, activityRisingEdges: 1,
      activityFallingEdges: 0, unmatchedActivityEdges: 0, userActivityCorrelationAttempts: 1,
      successfulCorrelations: 1, staleActivityEdges: 0, cycleStartAttempts: 1,
      cycleStartedEvents: 1, cycleStartRejectedNoSignals: 0, cycleCompletedEvents: 0,
      eventSinkAttempts: 1, eventSinkAccepted: 1, eventSinkRejected: 0, eventSinkErrors: 0,
      active: true, pending: false, settling: false, lastDecision: 'cycle-start-emitted'
    },
    snapshot: {
      snapshotCount: 13, mainFoundCount: 13, lastRootFound: true, lastActivity: true,
      lastUserMessageCount: 1, lastAssistantMessageCount: 0, lastSignalIds: ['stop-control'],
      lastSignalPresence: {
        'aria-busy': { matchingCount: 0, visibleCount: 0 },
        'data-is-streaming': { matchingCount: 0, visibleCount: 0 },
        'stop-control': { matchingCount: 1, visibleCount: 1 },
        'agent-progress': { matchingCount: 0, excludedCount: 0, visibleCount: 0 }
      }
    }
  };
  const runtime = mockRuntime({
    tabsToInject: [{ id: 71, url: 'https://chatgpt.com/c/private-test-only' }],
    cycleDiagnostics
  });
  const state = await deliver(runtime, { kind: 'harmonia:get' });
  assert.equal(state.ok, true);
  assert.equal(state.value.version, '0.4.9');
  assert.equal(state.value.cycleDiagnostics.reportingTabCount, 1);
  assert.equal(state.value.cycleDiagnostics.totals.observer.activityRisingEdges, 1);
  assert.equal(state.value.cycleDiagnostics.totals.snapshot.signalPresence['stop-control'].visibleCount, 1);
  const serialized = JSON.stringify(state.value.cycleDiagnostics);
  for (const forbidden of ['private-test-only', 'conversation_id', 'cycle_id', 'tabId', 'sessionId']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
test('synthetic: blocked remote repository sync cannot hold local startup or offline event capture', async () => {
  let remoteFetches = 0;
  const tab = { id: 23, url: 'https://chatgpt.com/c/synthetic-conversation' };
  const runtime = mockRuntime({
    blockRepositorySync: true,
    tabsToInject: [tab],
    onRepositoryFetch() { remoteFetches += 1; }
  });
  const settings = await deliver(runtime, { kind: 'harmonia:auto-settings' });
  assert.equal(settings.ok, true);
  assert.equal(settings.value.enabled, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(remoteFetches >= 1, 'the repository sync must be pending while local startup proceeds');
  assert.equal(runtime.injectedScripts.length, 1, 'the existing ChatGPT tab must receive the content scripts');
  assert.equal(runtime.injectedScripts[0].files.join(','), 'cycle-observer.js,surface-catalog.js,content.js');
  assert.equal(runtime.sentMessages.length, 1);
  assert.equal(runtime.sentMessages[0].message.kind, 'harmonia:start');

  const payload = {
    catalogVersion: '0.1.3',
    fingerprint: 'a'.repeat(64),
    features: ['surface.main-chat','navigation.primary-region','surface.dialog'],
    auxiliarySurfaces: {
      schema: 'harmonia.auxiliary-ui-surfaces.v1',
      features: ['navigation.primary-region','surface.dialog','invented.private-feature'],
      regions: [{ kind: 'navigation', count: 2, visibleCount: 1, truncated: false, samples: [
        { tag: 'nav', role: 'navigation', testId: 'sidebar.primary', classes: ['flex','gap-2'], childCount: 4, visible: true, expanded: null, hasPopup: null, modal: false, disabled: false, label: 'PRIVATE NAV TEXT', href: 'https://private.invalid', value: 'SECRET' }
      ]},{kind:'private-account',count:1,visibleCount:1,samples:[]}],
      privacy: { textCaptured: false, labelsCaptured: false, fieldValuesCaptured: false, hrefsCaptured: false, contentCaptured: false }
    },
    controls: [],
    structure: { nodes: [], total: 0, truncated: false },
    stylesheets: [],
    viewport: { width: 1280, height: 720, devicePixelRatio: 1 },
    layout: {},
    counts: { controls: 0, userMessages: 0, assistantMessages: 0, styleSheets: 0 }
  };
  const accepted = await deliver(runtime, {
    kind: 'harmonia:event',
    event: { type: 'ui.surface.scan', payload }
  }, { tab });
  assert.equal(accepted.ok, true);
  const queued = runtime.store.harmoniaPendingEvents;
  assert.equal(queued.length, 2); // capture.started + first ui.surface.scan
  assert.deepEqual(queued.map(event => event.type), ['capture.started', 'ui.surface.scan']);
  assert.equal(queued[1].payload.privacy.conversationTextCaptured, false);
  assert.deepEqual(Array.from(queued[1].payload.auxiliarySurfaces.features), ['navigation.primary-region','surface.dialog']);
  assert.equal(queued[1].payload.auxiliarySurfaces.regions.length, 1);
  assert.equal(queued[1].payload.auxiliarySurfaces.regions[0].samples[0].testId, 'sidebar.primary');
  const auxSerialized = JSON.stringify(queued[1].payload.auxiliarySurfaces);
  for (const forbidden of ['PRIVATE NAV TEXT','private.invalid','SECRET','invented.private-feature','private-account']) assert.equal(auxSerialized.includes(forbidden), false);

  const popupState = await deliver(runtime, { kind: 'harmonia:get' });
  assert.equal(popupState.ok, true);
  assert.equal(popupState.value.collector, false);
  assert.equal(popupState.value.pendingEvents, 2);
  assert.equal(popupState.value.coverage.source, 'local-outbox');
  assert.equal(popupState.value.coverage.scanCount, 1);
  assert.deepEqual(Array.from(popupState.value.coverage.observedFeatureIds), ['navigation.primary-region','surface.dialog','surface.main-chat']);
});
test('synthetic: collector rejection exposes only a bounded error code and preserves the pending event', async () => {
  const queuedEvent = {
    schema: 'harmonia.event.v1',
    eventId: '123e4567-e89b-42d3-a456-426614174001',
    sessionId: '123e4567-e89b-42d3-a456-426614174000',
    type: 'capture.started',
    source: 'extension',
    capturedAt: '2026-11-10T20:00:00.000Z',
    payload: { url: 'https://chatgpt.com/c/[conversation]', version: '0.4.6', mode: 'automatic-interface-architecture' }
  };
  const runtime = mockRuntime({
    initialStorage: { harmoniaPendingEvents: [queuedEvent] },
    collectorAvailable: true,
    token: 'synthetic-local-test-token',
    collectorEventError: { status: 400, code: 'invalid-event-identity' }
  });
  const state = await deliver(runtime, { kind: 'harmonia:get' });
  assert.equal(state.ok, true);
  assert.equal(state.value.collector, true);
  assert.equal(state.value.pendingEvents, 1);
  assert.match(state.value.lastError, /HTTP 400 \(invalid-event-identity\)/);
  assert.equal(runtime.store.harmoniaPendingEvents.length, 1);
  assert.deepEqual(runtime.store.harmoniaPendingEvents[0], queuedEvent);
  assert.equal(JSON.stringify(state.value).includes(queuedEvent.eventId), false);
  assert.equal(JSON.stringify(state.value).includes('123e4567-e89b-42d3-a456-426614174000'), false);
});

test('synthetic: bounded cycle diagnostics use a strict payload and never synthesize a tab conversation id', async () => {
  const runtime = mockRuntime();
  const tab = { id: 29, url: 'https://chatgpt.com/c/diagnostic-private-id' };
  const payload = {
    stage:'signal_state',elapsed_ms:100,activity:true,
    signals:[
      {id:'aria-busy',matching_count:1,excluded_count:0,visible_count:1},
      {id:'data-is-streaming',matching_count:0,excluded_count:0,visible_count:0},
      {id:'stop-control',matching_count:1,excluded_count:1,visible_count:0},
      {id:'agent-progress',matching_count:0,excluded_count:0,visible_count:0}
    ]
  };
  const ack = await deliver(runtime,{kind:'harmonia:cycle-diagnostic',payload},{tab});
  assert.equal(ack.ok,true);
  assert.equal(ack.value.ok,true);
  assert.equal(ack.value.delivery,'queued_outbox');
  const queued = runtime.store.harmoniaPendingEvents;
  assert.equal(queued.length,2); // capture.started + diagnostic trace
  const trace = queued.find(event=>event.type==='diag.cycle.trace');
  assert.ok(trace);
  assert.equal(trace.source,'cycle-observer-diagnostic');
  assert.equal(trace.payload.sequence,1);
  assert.equal('conversation' in trace,false);
  const serialized=JSON.stringify(trace.payload);
  for(const forbidden of ['conversation_id','cycle_id','sessionId','tabId','diagnostic-private-id','prompt','response','selector']) {
    assert.equal(serialized.includes(forbidden),false);
  }
  const bad = await deliver(runtime,{kind:'harmonia:cycle-diagnostic',payload:{...payload,prompt:'private'}},{tab});
  assert.equal(bad.value,false);
  assert.equal(runtime.store.harmoniaPendingEvents.length,2);
});
