'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createFrontActivityStore } = require('./front-activity-store');
const seedRegistry = require('../Extension/front-registry.json');

const conversationId = '6af63886-1a9c-83e8-a5ae-448392d6d61d';
const conversationUrl = 'https://chatgpt.com/c/' + conversationId;
const localConversationId = '01a1d1f1-febb-7736-88da-74e3537d2657';
const cycleId = '01a1d1dc-f671-7823-93d8-7caca36e0b07';
const registry = {
  timezone: 'America/Mexico_City',
  fronts: [
    { id: 'harmonia', name: 'Harmonia' },
    { id: 'dictado-voz', name: 'Dictado' }
  ]
};

function harness(registryOverride = registry) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonia-front-'));
  const index = {
    schema: 'harmonia.index.v1',
    totalBytes: 0,
    stopped: false,
    sessions: {},
    seenEventIds: {},
    frontActivity: { schema: 'harmonia.front-activity-index.v1', assignments: {}, activityByConversation: {} }
  };
  let persistCount = 0;
  const store = createFrontActivityStore({
    index, registry: registryOverride, root, originalsDir: path.join(root, 'originals'),
    maxBytes: 1024 * 1024, persist: () => { persistCount++; },
    pruneSeenEventIds: () => {}
  });
  return { root, index, store, persistCount: () => persistCount, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function event(type, payload) {
  const at = type === 'front.assignment' ? payload.assigned_at : payload.updated_at;
  return {
    schema: 'harmonia.event.v1',
    eventId: crypto.randomUUID(),
    sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    conversation: conversationId,
    type,
    source: 'test',
    capturedAt: at,
    payload
  };
}
function assignment(at = '2026-11-13T16:40:00.000Z') {
  return {
    front_id: 'harmonia', front_name: 'Harmonia',
    conversation_id: conversationId, conversation_url: conversationUrl,
    association: 'operator_selection', assigned_at: at
  };
}
function activity(at = '2026-11-13T16:50:00.000Z', kind = 'assistant_response_completed') {
  return {
    front_id: 'harmonia', front_name: 'Harmonia',
    conversation_id: conversationId, conversation_url: conversationUrl,
    activity_kind: kind, updated_at: at,
    local_conversation_id: localConversationId, cycle_id: cycleId
  };
}

test('requires an explicit front assignment before conversation activity is recorded', () => {
  const h = harness();
  try {
    assert.throws(() => h.store.record(event('front.activity', activity())), /front-assignment-required/);
    assert.equal(Object.keys(h.index.frontActivity.activityByConversation).length, 0);
  } finally { h.cleanup(); }
});

test('persists assignment and activity in the existing JSONL/index and reports the latest front row', () => {
  const h = harness();
  try {
    const assigned = h.store.record(event('front.assignment', assignment()));
    const active = h.store.record(event('front.activity', activity()));
    assert.equal(assigned.storedType, 'front.assignment');
    assert.equal(active.storedType, 'front.activity');
    assert.ok(h.index.frontActivity.assignments[conversationId]);
    assert.equal(h.index.frontActivity.activityByConversation[conversationId].updatedAt, '2026-11-13T16:50:00.000Z');
    assert.equal(Object.keys(h.index.sessions).length, 1);
    const files = [];
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(target); else files.push(target);
    });
    walk(path.join(h.root, 'originals'));
    assert.equal(files.length, 1);
    assert.equal(fs.readFileSync(files[0], 'utf8').trim().split('\n').length, 2);
    const report = h.store.report('24h', new Date('2026-11-13T18:50:00.000Z'));
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].frontName, 'Harmonia');
    assert.equal(report.rows[0].relativeLabel, 'hace 2 h');
    assert.equal(report.rows[0].conversationUrl, conversationUrl);
    assert.equal(report.rows[0].source, 'extension_cycle');
  } finally { h.cleanup(); }
});

test('rejects a conversation URL with query or a non-ChatGPT host instead of storing a broadened URL', () => {
  const h = harness();
  try {
    const invalid = event('front.assignment', {
      ...assignment(), conversation_url: conversationUrl + '?q=private'
    });
    assert.throws(() => h.store.record(invalid), /front-conversation-url-invalid/);
  } finally { h.cleanup(); }
});

test('rejects uncontracted fields, including conversation text', () => {
  const h = harness();
  try {
    const invalid = event('front.assignment', { ...assignment(), prompt: 'private text' });
    assert.throws(() => h.store.record(invalid), /front-event-payload-keys-invalid/);
  } finally { h.cleanup(); }
});

test('deduplicates event IDs and rejects replay with a different payload hash', () => {
  const h = harness();
  try {
    const value = event('front.assignment', assignment());
    h.store.record(value);
    assert.equal(h.store.record(value).duplicate, true);
    const changed = { ...value, payload: { ...value.payload, front_name: 'Dictado' } };
    assert.throws(() => h.store.record(changed), /front-registry-mismatch/);
  } finally { h.cleanup(); }
});

test('a front keeps only its most recently assigned conversation active', () => {
  const h = harness();
  try {
    h.store.record(event('front.assignment', assignment()));
    h.store.record(event('front.activity', activity()));
    const secondId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const secondUrl = 'https://chatgpt.com/c/' + secondId;
    const assignedAt = '2026-11-13T16:55:00.000Z';
    const secondAssignment = event('front.assignment', {
      ...assignment(assignedAt), conversation_id: secondId, conversation_url: secondUrl
    });
    secondAssignment.conversation = secondId;
    secondAssignment.capturedAt = assignedAt;
    h.store.record(secondAssignment);
    const reportBeforeWork = h.store.report('24h', new Date('2026-11-13T18:50:00.000Z'));
    assert.equal(reportBeforeWork.rows.length, 0);
    assert.throws(() => h.store.record(event('front.activity', activity('2026-11-13T16:56:00.000Z'))), /front-assignment-required/);
    const secondActivity = event('front.activity', {
      ...activity('2026-11-13T16:57:00.000Z'), conversation_id: secondId, conversation_url: secondUrl
    });
    secondActivity.conversation = secondId;
    h.store.record(secondActivity);
    const report = h.store.report('24h', new Date('2026-11-13T18:50:00.000Z'));
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].conversationUrl, secondUrl);
  } finally { h.cleanup(); }
});

test('uses export-header seeds only inside the requested rolling windows and preserves source labels', () => {
  const h = harness(seedRegistry);
  try {
    const now = new Date('2026-11-13T19:17:12.000Z');
    const r24 = h.store.report('24h', now);
    const r48 = h.store.report('48h', now);
    const r72 = h.store.report('72h', now);
    const r7d = h.store.report('7d', now);
    assert.deepEqual(r24.rows.map(row => row.frontId), ['harmonia']);
    assert.deepEqual(r48.rows.map(row => row.frontId), ['harmonia']);
    assert.deepEqual(r72.rows.map(row => row.frontId), ['harmonia']);
    assert.deepEqual(r7d.rows.map(row => row.frontId), ['harmonia','dictado-voz']);
    assert.equal(r7d.rows[0].source, 'export_header');
    assert.equal(r7d.rows[0].conversationUrl, 'https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d');
    assert.equal(r7d.rows[1].relativeLabel, 'viernes pasado · tarde');
    assert.ok(!r7d.rows.some(row => ['custodia','notas','tareas-automaticas','observabilidad-mcp'].includes(row.frontId)));
  } finally { h.cleanup(); }
});

test('rolling windows return at most one current conversation per front', () => {
  const h = harness();
  try {
    h.store.record(event('front.assignment', assignment()));
    h.store.record(event('front.activity', activity('2026-11-13T16:50:00.000Z')));
    const report24h = h.store.report('24h', new Date('2026-11-13T18:50:00.000Z'));
    const report7d = h.store.report('7d', new Date('2026-11-13T18:50:00.000Z'));
    assert.equal(report24h.rows.length, 1);
    assert.equal(report7d.rows.length, 1);
    assert.throws(() => h.store.report('30d'), /front-report-window-invalid/);
  } finally { h.cleanup(); }
});
