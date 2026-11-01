'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createEpConsumerAdapter } = require('../ep-consumer-adapter');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonia-ep-'));
  const originalsDir = path.join(root, 'originals');
  const surfacesDir = path.join(root, 'surfaces');
  fs.mkdirSync(path.join(originalsDir, '2026-11-01'), { recursive: true });
  fs.mkdirSync(surfacesDir, { recursive: true });
  const event = {
    schema: 'harmonia.event.v1',
    eventId: 'a9fb6f12-8a7f-4d61-bc78-cfb7b68d6ca1',
    sessionId: 'f2c19d80-49b5-4d21-8c8a-41c66c6bcf4f',
    type: 'capture.started',
    capturedAt: '2026-11-01T20:00:00.000Z',
    payload: { version: '0.3.0' }
  };
  const line = JSON.stringify(event) + '\n';
  const sourcePath = path.join(originalsDir, '2026-11-01', event.sessionId + '.jsonl');
  fs.writeFileSync(sourcePath, line, 'utf8');
  return { root, originalsDir, surfacesDir, event, line, sourcePath };
}

test('reconciles an original written before the ledger and creates a blocked durable reference', async t => {
  const f = fixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  const adapter = createEpConsumerAdapter(f);
  const result = await adapter.reconcile();
  assert.equal(result.discovered, 1);
  const row = adapter.findByEventId(f.event.eventId);
  assert.ok(row);
  assert.equal(row.localState, 'LOCAL_DURABLE');
  assert.equal(row.cloudState, 'CLOUD_PENDING');
  assert.equal(row.eligibility, 'PENDING_ALLOWLIST_APPROVAL');
  assert.match(row.operationRef, /^[0-9a-f]{64}$/);
});

test('duplicate enqueue keeps the same operation identity', async t => {
  const f = fixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  const adapter = createEpConsumerAdapter(f);
  await adapter.reconcile();
  const ref = 'originals/2026-11-01/' + f.event.sessionId + '.jsonl#' + f.event.eventId;
  const first = await adapter.enqueue(ref);
  const second = await adapter.enqueue(ref);
  assert.equal(first.operationRef, second.operationRef);
  assert.equal(second.duplicate, true);
});

test('flush never attempts network without the official EP contract and allowlist', async t => {
  const f = fixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  const adapter = createEpConsumerAdapter(f);
  await adapter.reconcile();
  const result = await adapter.flush();
  assert.equal(result.blocked, true);
  assert.equal(result.attempted, 0);
});

test('recover verifies the local source but does not claim EP verification', async t => {
  const f = fixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  const adapter = createEpConsumerAdapter(f);
  await adapter.reconcile();
  const row = adapter.findByEventId(f.event.eventId);
  const result = await adapter.recover(row.operationRef);
  assert.equal(result.localVerified, true);
  assert.equal(result.epVerified, false);
  assert.equal(result.remoteState, 'NOT_QUERIED');
});
