'use strict';

require('fake-indexeddb/auto');
const test = require('node:test');
const assert = require('node:assert/strict');
const outboxPath = require.resolve('../durable-outbox.js');

function loadOutbox() {
  delete require.cache[outboxPath];
  require(outboxPath);
  return globalThis.HarmoniaDurableOutbox;
}

test('durable outbox is idempotent, retries, survives module restart and acknowledges only explicitly', async () => {
  let outbox = loadOutbox();
  const event = {
    schema: 'harmonia.event.v1',
    eventId: 'a9fb6f12-8a7f-4d61-bc78-cfb7b68d6ca1',
    sessionId: 'f2c19d80-49b5-4d21-8c8a-41c66c6bcf4f',
    type: 'capture.started',
    capturedAt: '2026-11-01T20:00:00.000Z',
    payload: { privacy: { conversationTextCaptured: false } }
  };

  const inserted = await outbox.enqueue(event);
  assert.equal(inserted.inserted, true);
  assert.equal((await outbox.enqueue(event)).inserted, false);
  await assert.rejects(
    () => outbox.enqueue({ ...event, type: 'capture.stopped' }),
    /event-id-payload-conflict/
  );

  outbox = loadOutbox();
  let status = await outbox.status();
  assert.equal(status.pendingCount, 1);

  assert.equal(await outbox.defer(event.eventId, 'unit-test-offline'), true);
  status = await outbox.status();
  assert.equal(status.retryingCount, 1);
  assert.equal((await outbox.listPending(10)).length, 0);
  assert.equal((await outbox.listPending(10, Date.now() + 60 * 60 * 1000)).length, 1);

  await outbox.acknowledge(event.eventId);
  status = await outbox.status();
  assert.equal(status.pendingCount, 0);
});
