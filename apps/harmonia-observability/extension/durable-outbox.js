(() => {
  'use strict';
  const DB_NAME = 'harmonia-local-first';
  const DB_VERSION = 1;
  const STORE = 'pendingEvents';
  const MAX_PENDING = 10000;
  let opening = null;

  function openDb() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) return reject(new Error('indexeddb-unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'eventId' });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
          store.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
      request.onerror = () => { opening = null; reject(request.error || new Error('indexeddb-open-failed')); };
      request.onblocked = () => { opening = null; reject(new Error('indexeddb-upgrade-blocked')); };
    });
    return opening;
  }

  function complete(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb-transaction-failed'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-transaction-aborted'));
    });
  }

  async function enqueue(event) {
    if (!event || typeof event.eventId !== 'string' || !event.eventId) throw new Error('invalid-event-id');
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let result = null;
      let failure = null;
      const get = store.get(event.eventId);
      get.onsuccess = () => {
        const existing = get.result;
        if (existing) {
          if (JSON.stringify(existing.event) !== JSON.stringify(event)) {
            failure = new Error('event-id-payload-conflict');
            try { tx.abort(); } catch {}
            return;
          }
          result = { inserted: false, eventId: event.eventId };
          return;
        }
        const count = store.count();
        count.onsuccess = () => {
          if (count.result >= MAX_PENDING) {
            failure = new Error('local-outbox-capacity-reached');
            try { tx.abort(); } catch {}
            return;
          }
          const now = Date.now();
          store.add({ eventId: event.eventId, event, queuedAt: now, attempts: 0, nextAttemptAt: 0, lastErrorCode: null });
          result = { inserted: true, eventId: event.eventId };
        };
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(failure || tx.error || new Error('indexeddb-transaction-failed'));
      tx.onabort = () => reject(failure || tx.error || new Error('indexeddb-transaction-aborted'));
    });
  }

  async function listPending(limit = 50, now = Date.now()) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => {
        const rows = (request.result || [])
          .filter(row => Number(row.nextAttemptAt || 0) <= now)
          .sort((a, b) => a.queuedAt - b.queuedAt)
          .slice(0, Math.max(1, Math.min(500, Number(limit) || 50)));
        resolve(rows);
      };
      request.onerror = () => reject(request.error || new Error('indexeddb-read-failed'));
    });
  }

  async function acknowledge(eventId) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(eventId);
    await complete(tx);
    return true;
  }

  async function defer(eventId, errorCode) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let updated = false;
      const request = store.get(eventId);
      request.onsuccess = () => {
        const row = request.result;
        if (!row) return;
        row.attempts = Math.min(1000000, Number(row.attempts || 0) + 1);
        const delay = Math.min(60 * 60 * 1000, 1000 * (2 ** Math.min(row.attempts, 12)));
        row.nextAttemptAt = Date.now() + delay;
        row.lastErrorCode = String(errorCode || 'collector-unavailable').slice(0, 80);
        store.put(row);
        updated = true;
      };
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error || new Error('indexeddb-retry-write-failed'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-retry-write-aborted'));
    });
  }

  async function status() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => {
        const rows = request.result || [];
        rows.sort((a, b) => a.queuedAt - b.queuedAt);
        resolve({
          pendingCount: rows.length,
          oldestQueuedAt: rows.length ? new Date(rows[0].queuedAt).toISOString() : null,
          retryingCount: rows.filter(row => row.attempts > 0).length,
          capacity: MAX_PENDING
        });
      };
      request.onerror = () => reject(request.error || new Error('indexeddb-status-failed'));
    });
  }

  globalThis.HarmoniaDurableOutbox = Object.freeze({ enqueue, listPending, acknowledge, defer, status });
})();