'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

function walkJsonl(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkJsonl(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jsonl')) result.push(full);
  }
  return result.sort();
}

function createEpConsumerAdapter({ root, originalsDir, surfacesDir }) {
  const dataRoot = path.resolve(root);
  const sourceRoot = path.resolve(originalsDir);
  const surfaceRoot = path.resolve(surfacesDir);
  const ledgerPath = path.join(dataRoot, 'ep-consumer-ledger.jsonl');
  const byEventId = new Map();
  const byOperationRef = new Map();
  let ledgerLoaded = false;
  let ledgerIntegrityErrors = 0;
  let lastReconciledAt = null;

  function applyRow(row) {
    if (row.recordType !== 'SOURCE_REGISTERED' || !UUID.test(String(row.eventId || ''))) return;
    const existing = byEventId.get(row.eventId);
    if (existing && (existing.sourceSha256 !== row.sourceSha256 || existing.operationRef !== row.operationRef)) {
      ledgerIntegrityErrors++;
      return;
    }
    byEventId.set(row.eventId, row);
    byOperationRef.set(row.operationRef, row);
  }

  async function loadLedger() {
    if (ledgerLoaded) return;
    ledgerLoaded = true;
    if (!fs.existsSync(ledgerPath)) return;
    const stream = fs.createReadStream(ledgerPath, { encoding: 'utf8' });
    const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        if (row.schema !== 'harmonia.ep-ledger.v1' || row.consumer !== 'harmonia') {
          ledgerIntegrityErrors++;
          continue;
        }
        applyRow(row);
      } catch {
        ledgerIntegrityErrors++;
      }
    }
  }

  function appendDurable(row) {
    fs.mkdirSync(dataRoot, { recursive: true });
    const fd = fs.openSync(ledgerPath, 'a');
    try {
      const data = Buffer.from(JSON.stringify(row) + '\n', 'utf8');
      let offset = 0;
      while (offset < data.length) offset += fs.writeSync(fd, data, offset, data.length - offset);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }

  function normalizeSourceRef(sourceRef) {
    if (typeof sourceRef !== 'string' || !sourceRef) throw new Error('invalid-source-reference');
    const split = sourceRef.lastIndexOf('#');
    if (split <= 0) throw new Error('invalid-source-reference');
    const relative = sourceRef.slice(0, split).replace(/\\/g, '/');
    const eventId = sourceRef.slice(split + 1);
    if (!UUID.test(eventId) || !/^originals\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[0-9a-f-]{36}\.jsonl$/i.test(relative)) {
      throw new Error('invalid-source-reference');
    }
    const full = path.resolve(dataRoot, ...relative.split('/'));
    if (!inside(dataRoot, full) || !inside(sourceRoot, full)) throw new Error('source-reference-outside-root');
    return { full, relative, eventId };
  }

  async function readSource(sourceRef) {
    const parsed = normalizeSourceRef(sourceRef);
    if (!fs.existsSync(parsed.full)) throw new Error('source-not-found');
    const lines = readline.createInterface({ input: fs.createReadStream(parsed.full, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event.eventId === parsed.eventId) return { event, line: line + '\n', parsed };
    }
    throw new Error('source-event-not-found');
  }

  function registerStoredEvent(sourceRef, event, sourceLine, requestSha256 = null) {
    if (!event || !UUID.test(String(event.eventId || ''))) throw new Error('invalid-stored-event-id');
    const parsed = normalizeSourceRef(sourceRef);
    const sourceSha256 = sha256(sourceLine);
    const existing = byEventId.get(event.eventId);
    if (existing) {
      if (existing.sourceSha256 !== sourceSha256 || (existing.requestSha256 && requestSha256 && existing.requestSha256 !== requestSha256)) {
        const error = new Error('event-id-integrity-conflict');
        error.code = 'integrity-conflict';
        throw error;
      }
      return { duplicate: true, operationRef: existing.operationRef, state: existing.cloudState };
    }

    const operationRef = sha256('HARMONIA\n' + event.eventId + '\n' + sourceSha256);
    const surfaceRef = typeof event.payload?.surfaceRef === 'string' ? event.payload.surfaceRef : null;
    let surfaceSha256 = null;
    if (surfaceRef) {
      const fullSurface = path.resolve(dataRoot, ...surfaceRef.replace(/\\/g, '/').split('/'));
      if (!inside(dataRoot, fullSurface) || !inside(surfaceRoot, fullSurface) || !fs.existsSync(fullSurface)) {
        const error = new Error('surface-reference-integrity-error');
        error.code = 'integrity-error';
        throw error;
      }
      surfaceSha256 = sha256(fs.readFileSync(fullSurface));
    }
    const row = {
      schema: 'harmonia.ep-ledger.v1',
      recordType: 'SOURCE_REGISTERED',
      consumer: 'harmonia',
      operationRef,
      eventId: event.eventId,
      sessionId: event.sessionId,
      eventType: event.type,
      capturedAt: event.capturedAt,
      sourceRef: parsed.relative + '#' + event.eventId,
      sourceSha256,
      sourceBytes: Buffer.byteLength(sourceLine, 'utf8'),
      requestSha256: requestSha256 || null,
      surfaceRef,
      surfaceSha256,
      localState: 'LOCAL_DURABLE',
      cloudState: 'CLOUD_PENDING',
      eligibility: 'PENDING_ALLOWLIST_APPROVAL',
      blockers: ['ALLOWLIST_NOT_APPROVED', 'EP_CONTRACT_UNAVAILABLE'],
      attempts: 0,
      receipt: null,
      recordedAt: new Date().toISOString()
    };
    appendDurable(row);
    applyRow(row);
    return { duplicate: false, operationRef, state: row.cloudState };
  }

  async function enqueue(sourceRef) {
    await loadLedger();
    const source = await readSource(sourceRef);
    return registerStoredEvent(sourceRef, source.event, source.line);
  }

  async function reconcile() {
    await loadLedger();
    const files = walkJsonl(sourceRoot);
    let discovered = 0;
    let conflicts = 0;
    for (const full of files) {
      const relative = path.relative(dataRoot, full).split(path.sep).join('/');
      const lines = readline.createInterface({ input: fs.createReadStream(full, { encoding: 'utf8' }), crlfDelay: Infinity });
      for await (const line of lines) {
        if (!line) continue;
        let event;
        try { event = JSON.parse(line); } catch { ledgerIntegrityErrors++; continue; }
        if (!UUID.test(String(event.eventId || ''))) continue;
        if (byEventId.has(event.eventId)) continue;
        try {
          registerStoredEvent(relative + '#' + event.eventId, event, line + '\n');
          discovered++;
        } catch {
          conflicts++;
          ledgerIntegrityErrors++;
        }
      }
    }
    lastReconciledAt = new Date().toISOString();
    return { scannedFiles: files.length, discovered, conflicts, integrityErrors: ledgerIntegrityErrors, reconciledAt: lastReconciledAt };
  }

  function findByEventId(eventId) {
    return byEventId.get(eventId) || null;
  }

  function getStatus() {
    const rows = [...byOperationRef.values()];
    return {
      schema: 'harmonia.ep-consumer-status.v1',
      consumer: 'harmonia',
      localLedger: 'READY',
      localRecords: rows.length,
      localDurableCount: rows.filter(row => row.localState === 'LOCAL_DURABLE').length,
      cloudPendingCount: rows.filter(row => row.cloudState === 'CLOUD_PENDING').length,
      eligibilityPendingCount: rows.filter(row => row.eligibility === 'PENDING_ALLOWLIST_APPROVAL').length,
      epTransportEnabled: false,
      epContractVersion: null,
      remoteState: 'NOT_CONNECTED',
      blockers: ['ALLOWLIST_NOT_APPROVED', 'EP_OFFICIAL_CONTRACT_UNAVAILABLE'],
      ledgerIntegrityErrors,
      lastReconciledAt
    };
  }

  async function flush(options = {}) {
    await loadLedger();
    return {
      attempted: 0,
      persisted: 0,
      blocked: true,
      reason: 'EP_CONTRACT_OR_ALLOWLIST_NOT_AVAILABLE',
      optionsAccepted: Object.keys(options || {}).length
    };
  }

  async function recover(operationRef) {
    await loadLedger();
    const row = byOperationRef.get(operationRef);
    if (!row) return { found: false, localVerified: false, epVerified: false, reason: 'operation-not-found' };
    let localVerified = false;
    let error = null;
    try {
      const source = await readSource(row.sourceRef);
      localVerified = sha256(source.line) === row.sourceSha256;
      if (!localVerified) error = 'source-hash-mismatch';
    } catch (cause) {
      error = String(cause.message || cause);
    }
    return {
      found: true,
      operationRef: row.operationRef,
      eventId: row.eventId,
      localVerified,
      epVerified: false,
      remoteState: 'NOT_QUERIED',
      reason: error || 'EP_OFFICIAL_CONTRACT_UNAVAILABLE'
    };
  }

  return Object.freeze({ enqueue, registerStoredEvent, reconcile, findByEventId, getStatus, flush, recover });
}

module.exports = { createEpConsumerAdapter };