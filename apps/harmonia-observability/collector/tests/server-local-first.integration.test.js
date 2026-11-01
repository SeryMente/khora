'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const serverPath = path.resolve(__dirname, '..', 'server.js');
const TOKEN = 'harmonia-local-first-test-token';

async function reservePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  let lastError = 'not-started';
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error('collector-exited: ' + child.exitCode);
    try {
      const response = await fetch(baseUrl + '/health', { headers: { 'x-harmonia-token': TOKEN } });
      if (response.ok) return await response.json();
      lastError = 'HTTP ' + response.status;
    } catch (error) {
      lastError = String(error.message || error);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('collector-health-timeout: ' + lastError);
}

async function startCollector(t, root) {
  const port = await reservePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, HARMONIA_DATA: root, HARMONIA_PORT: String(port), HARMONIA_TOKEN: TOKEN },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  try {
    await waitForHealth(baseUrl, child);
  } catch (error) {
    child.kill('SIGKILL');
    throw new Error(String(error.message || error) + '\nstdout:\n' + stdout + '\nstderr:\n' + stderr);
  }
  t.after(async () => {
    try {
      await fetch(baseUrl + '/shutdown', { method: 'POST', headers: { 'x-harmonia-token': TOKEN } });
    } catch {}
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise(resolve => child.once('exit', resolve)),
        new Promise(resolve => setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 1500))
      ]);
    }
  });
  return { baseUrl, root, child };
}

function event(eventId, sessionId, capturedAt, collectorReceivedAt) {
  return {
    schema: 'harmonia.event.v1',
    eventId,
    sessionId,
    conversation: 'tab-12',
    type: 'capture.started',
    source: 'extension',
    capturedAt,
    payload: {
      url: 'https://chatgpt.com/c/test-conversation',
      version: '0.3.0',
      mode: 'automatic-interface-architecture',
      privacy: {
        conversationTextCaptured: false,
        composerTextCaptured: false,
        fieldValuesCaptured: false,
        hrefsCaptured: false,
        imageUrlsCaptured: false,
        menusExcluded: true
      }
    },
    ...(collectorReceivedAt ? { collectorReceivedAt } : {})
  };
}

test('HTTP collector stores JSONL and ledger durably and rejects conflicting replays', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonia-collector-http-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { baseUrl } = await startCollector(t, root);
  const first = event(
    'a9fb6f12-8a7f-4d61-bc78-cfb7b68d6ca1',
    'f2c19d80-49b5-4d21-8c8a-41c66c6bcf4f',
    '2026-11-01T22:00:00.000Z'
  );
  const firstResponse = await fetch(baseUrl + '/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-harmonia-token': TOKEN },
    body: JSON.stringify(first)
  });
  assert.equal(firstResponse.status, 201);
  const firstAck = await firstResponse.json();
  assert.equal(firstAck.localState, 'LOCAL_DURABLE');
  assert.equal(firstAck.cloudState, 'CLOUD_PENDING');
  assert.match(firstAck.operationRef, /^[0-9a-f]{64}$/);

  const duplicateResponse = await fetch(baseUrl + '/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-harmonia-token': TOKEN },
    body: JSON.stringify(first)
  });
  assert.equal(duplicateResponse.status, 200);
  assert.equal((await duplicateResponse.json()).duplicate, true);

  const conflictResponse = await fetch(baseUrl + '/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-harmonia-token': TOKEN },
    body: JSON.stringify({ ...first, type: 'capture.stopped' })
  });
  assert.equal(conflictResponse.status, 409);

  const statusResponse = await fetch(baseUrl + '/ep/status', { headers: { 'x-harmonia-token': TOKEN } });
  const status = await statusResponse.json();
  assert.equal(status.localLedger, 'READY');
  assert.equal(status.localRecords, 1);
  assert.equal(status.epTransportEnabled, false);
  assert.equal(status.cloudPendingCount, 1);

  const originalsDir = path.join(root, 'originals');
  const jsonlFiles = [];
  for (const date of fs.readdirSync(originalsDir)) {
    for (const name of fs.readdirSync(path.join(originalsDir, date))) {
      if (name.endsWith('.jsonl')) jsonlFiles.push(path.join(originalsDir, date, name));
    }
  }
  assert.equal(jsonlFiles.length, 1);
  assert.equal(fs.readFileSync(jsonlFiles[0], 'utf8').trim().split('\n').length, 1);
  const ledger = fs.readFileSync(path.join(root, 'ep-consumer-ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].operationRef, firstAck.operationRef);
  assert.equal(ledger[0].sourceSha256.length, 64);
  assert.equal(ledger[0].localState, 'LOCAL_DURABLE');
  assert.equal(ledger[0].cloudState, 'CLOUD_PENDING');
});

test('startup reconciles post-activation JSONL and rebuilds a lagging index without enqueueing history', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonia-collector-recovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const originals = path.join(root, 'originals', '2026-11-01');
  fs.mkdirSync(originals, { recursive: true });
  fs.mkdirSync(path.join(root, 'surfaces'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ep-consumer-activation.json'), JSON.stringify({
    schema: 'harmonia.ep-activation.v1',
    consumer: 'harmonia',
    activatedAt: '2026-11-01T21:00:00.000Z'
  }), 'utf8');

  const current = event(
    'a9fb6f12-8a7f-4d61-bc78-cfb7b68d6ca1',
    'f2c19d80-49b5-4d21-8c8a-41c66c6bcf4f',
    '2026-11-01T21:02:00.000Z',
    '2026-11-01T21:02:01.000Z'
  );
  const historical = event(
    'd6f21c6a-a0b0-4d0a-ae42-1e5be8f90123',
    'e2c19d80-49b5-4d21-8c8a-41c66c6bcf4f',
    '2026-11-01T20:00:00.000Z',
    '2026-11-01T20:00:01.000Z'
  );
  const currentFile = path.join(originals, current.sessionId + '.jsonl');
  const historicalFile = path.join(originals, historical.sessionId + '.jsonl');
  fs.writeFileSync(currentFile, JSON.stringify(current) + '\n', 'utf8');
  fs.writeFileSync(historicalFile, JSON.stringify(historical) + '\n', 'utf8');
  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({
    schema: 'harmonia.index.v1',
    updatedAt: null,
    sessions: {},
    surfaceFingerprints: {},
    seenEventIds: {},
    coverage: null,
    uniqueSurfaceCount: 0,
    totalBytes: 0,
    stopped: false
  }), 'utf8');

  const { baseUrl } = await startCollector(t, root);
  const statusResponse = await fetch(baseUrl + '/ep/status', { headers: { 'x-harmonia-token': TOKEN } });
  const status = await statusResponse.json();
  assert.equal(status.localLedger, 'READY');
  assert.equal(status.localRecords, 1);
  assert.equal(status.cloudPendingCount, 1);

  const indexResponse = await fetch(baseUrl + '/index', { headers: { 'x-harmonia-token': TOKEN } });
  const index = await indexResponse.json();
  assert.equal(Object.keys(index.sessions).length, 2);
  assert.equal(index.totalBytes, fs.statSync(currentFile).size + fs.statSync(historicalFile).size);

  const ledgerRows = fs.readFileSync(path.join(root, 'ep-consumer-ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledgerRows.length, 1);
  assert.equal(ledgerRows[0].eventId, current.eventId);
  assert.equal(ledgerRows[0].eventId === historical.eventId, false);
});
