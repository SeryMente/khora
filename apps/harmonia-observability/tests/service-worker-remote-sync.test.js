'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID, webcrypto } = require('node:crypto');

const appRoot = path.resolve(__dirname, '..');
const extensionRoot = path.join(appRoot, 'extension');
const collectorPath = path.join(appRoot, 'collector', 'server.js');
const token = 'harmonia-e2e-test-token-only';
const remoteAlarm = 'harmonia-cora-provisional-sync';

function eventHook() {
  const listeners = [];
  return {
    addListener(fn) { listeners.push(fn); },
    listeners
  };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHealth(baseUrl, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error('El colector terminó antes de iniciar.');
    }
    try {
      const response = await fetch(baseUrl + '/health', {
        headers: { 'x-harmonia-token': token }
      });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('El colector no alcanzó HEALTH=OK.');
}

async function stopCollector(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

async function collectorRequest(baseUrl, pathname, method = 'GET', body) {
  const response = await fetch(baseUrl + pathname, {
    method,
    headers: {
      'x-harmonia-token': token,
      'content-type': 'application/json'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  return { status: response.status, data };
}

test('service worker conserva la outbox ante 401 y solo confirma tras persistencia Cora', async (t) => {
  const port = await freePort();
  const collectorBase = 'http://127.0.0.1:' + port;
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonia-service-worker-e2e-'));
  let collector;

  t.after(async () => {
    await stopCollector(collector);
    fs.rmSync(dataRoot, { recursive: true, force: true });
  });

  collector = spawn(process.execPath, [collectorPath], {
    env: {
      ...process.env,
      HARMONIA_TOKEN: token,
      HARMONIA_PORT: String(port),
      HARMONIA_DATA: dataRoot
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  collector.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  await waitForHealth(collectorBase, collector).catch((error) => {
    throw new Error(error.message + ' ' + stderr);
  });

  const localBuild = {
    schema: 'harmonia.repository-build.v1',
    version: '0.3.1',
    sourceRevision: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    catalogVersion: '1.2.0'
  };
  const remoteBuild = { ...localBuild };
  const remoteCatalog = {
    schema: 'harmonia.coverage-catalog.v1',
    version: '1.2.0',
    features: [],
    sources: []
  };

  let coraMode = 'unauthorized';
  const coraRequests = [];
  const storage = {};
  const onMessage = eventHook();
  const alarms = eventHook();
  let initializedResolve;
  const initialized = new Promise((resolve) => { initializedResolve = resolve; });

  const chrome = {
    storage: {
      local: {
        async get(keys) {
          const result = {};
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(storage, key)) {
              result[key] = storage[key];
            }
          }
          return result;
        },
        async set(values) {
          Object.assign(storage, values);
        }
      }
    },
    tabs: {
      async query({ url }) {
        if (String(url).startsWith('https://khora-web.vercel.app/')) {
          return [{
            id: 77,
            status: 'complete',
            url: 'https://khora-web.vercel.app/'
          }];
        }
        return [];
      },
      async sendMessage() { return { ok: true }; },
      onRemoved: eventHook(),
      onUpdated: eventHook()
    },
    scripting: {
      async executeScript({ func, args }) {
        const result = await func(...args);
        return [{ result }];
      }
    },
    runtime: {
      getManifest: () => ({ version: '0.3.1' }),
      getURL: (relative) => 'chrome-extension://harmonia-test/' + relative,
      onMessage,
      onInstalled: eventHook(),
      onStartup: eventHook()
    },
    alarms: {
      create(name) {
        if (name === remoteAlarm) initializedResolve();
      },
      onAlarm: alarms
    }
  };

  async function routedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith(collectorBase)) return fetch(url, init);
    if (url.startsWith('chrome-extension://')) return jsonResponse(localBuild);
    if (url.endsWith('/extension/build-info.json')) return jsonResponse(remoteBuild);
    if (url.endsWith('/coverage-catalog.json')) return jsonResponse(remoteCatalog);

    if (url === '/api/observaciones/runtime') {
      const batch = JSON.parse(init.body);
      coraRequests.push({
        method: init.method,
        source: init.headers && init.headers['x-khora-observation-source'],
        batch
      });

      if (coraMode === 'unauthorized') {
        return jsonResponse({ ok: false, error: 'Auth required' }, 401);
      }

      assert.equal(init.method, 'POST');
      assert.equal(init.headers['x-khora-observation-source'], 'harmonia-extension');
      assert.equal(batch.schema_version, '2.0');
      assert.equal(batch.source, 'harmonia-extension');
      assert.equal(batch.events.length, 1);
      assert.equal(batch.events[0].privacy_class, 'ANONYMIZED_TELEMETRY');
      assert.equal(batch.events[0].session_id, batch.session_id);
      assert.equal(batch.events[0].sequence, 1);

      const serialized = JSON.stringify(batch);
      assert.equal(serialized.includes('PRIVATE_LABEL_NOT_FOR_CORA'), false);
      assert.equal(serialized.includes('PRIVATE_PLACEHOLDER'), false);
      assert.equal(serialized.includes('PRIVATE_DOM_NODE'), false);
      assert.equal(serialized.includes('PRIVATE_STYLESHEET_PATH'), false);

      return jsonResponse({
        ok: true,
        runtime: {
          batch_id: batch.batch_id,
          source: batch.source,
          session_id: batch.session_id,
          accepted: batch.events.length,
          duplicates: 0,
          rejected: 0,
          total: batch.events.length,
          persisted: true
        }
      }, 200);
    }

    throw new Error('URL fetch inesperada: ' + url);
  }

  const context = {
    chrome,
    fetch: routedFetch,
    crypto: webcrypto,
    URL,
    TextEncoder,
    Response,
    Headers,
    navigator: { onLine: true },
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);

  context.importScripts = (...names) => {
    for (const name of names) {
      if (name === 'local-auth.js') {
        context.HARMONIA_TOKEN = token;
        continue;
      }
      const source = fs.readFileSync(path.join(extensionRoot, name), 'utf8');
      vm.runInContext(source, context, { filename: name });
    }
  };

  const workerPath = path.join(extensionRoot, 'service-worker.js');
  const workerSource = fs.readFileSync(workerPath, 'utf8');
  const collectorConstant = "const COLLECTOR='http://127.0.0.1:47321';";
  assert.equal(workerSource.split(collectorConstant).length - 1, 1,
    'se debe sustituir únicamente la constante del colector para aislar el puerto del test');
  const isolatedWorkerSource = workerSource.replace(
    collectorConstant,
    "const COLLECTOR='" + collectorBase + "';"
  );
  vm.runInContext(isolatedWorkerSource, context, { filename: 'service-worker.js' });

  let initTimer;
  await Promise.race([
    initialized,
    new Promise((_, reject) => {
      initTimer = setTimeout(() => reject(new Error('service worker no terminó de inicializar')), 5000);
    })
  ]).finally(() => clearTimeout(initTimer));

  assert.equal(onMessage.listeners.length, 1, 'el listener de mensajes del service worker debe quedar registrado');

  const sessionId = randomUUID();
  const event = {
    schema: 'harmonia.event.v1',
    eventId: randomUUID(),
    sessionId,
    conversation: 'tab-77',
    type: 'ui.surface.scan',
    source: 'page-observer',
    capturedAt: new Date().toISOString(),
    payload: {
      fingerprint: 'a'.repeat(64),
      catalogVersion: '1.2.0',
      features: ['chat.thread', 'composer.input'],
      controls: [{
        tag: 'button',
        role: 'button',
        label: 'PRIVATE_LABEL_NOT_FOR_CORA',
        testId: 'send',
        placeholder: 'PRIVATE_PLACEHOLDER'
      }],
      structure: {
        nodes: [{
          depth: 0,
          tag: 'main',
          role: 'main',
          testId: 'PRIVATE_DOM_NODE',
          classes: ['thread']
        }],
        total: 40,
        truncated: false
      },
      stylesheets: [{
        index: 0,
        path: 'PRIVATE_STYLESHEET_PATH',
        ruleCount: 8
      }],
      viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
      layout: { main: { tag: 'main', role: 'main', testId: 'main' } },
      counts: { controls: 1, userMessages: 4, assistantMessages: 5, styleSheets: 1 }
    }
  };

  const ingest = await collectorRequest(collectorBase, '/events', 'POST', event);
  assert.equal(ingest.status, 201, 'el colector debe ingerir el evento');
  const before = await collectorRequest(collectorBase, '/sync/status');
  assert.equal(before.data.pending, 1, 'el evento debe entrar en la outbox local');

  const notify = (message) => new Promise((resolve) => {
    const returned = onMessage.listeners[0](message, {}, resolve);
    assert.equal(returned, true, 'el listener asíncrono debe mantener abierto el canal de respuesta');
  });

  const rejected = await notify({ kind: 'harmonia:remote-sync' });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.value.ok, false, 'un 401 debe tratarse como fallo de sincronización');
  assert.match(rejected.value.error, /Auth required/);

  const retained = await collectorRequest(collectorBase, '/sync/status');
  assert.equal(retained.data.pending, 1, 'un 401 no debe confirmar ni borrar el evento local');
  assert.equal(retained.data.accepted, 0);

  coraMode = 'accepted';
  const accepted = await notify({ kind: 'harmonia:remote-sync' });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.ok, true, 'la confirmación de Cora debe habilitar el ACK');
  assert.equal(accepted.value.acceptedThisCall, 1);
  assert.equal(coraRequests.length, 2, 'el mismo evento pendiente debe reintentarse al recuperar autenticación');
  assert.equal(coraRequests[0].batch.events[0].event_uuid, event.eventId);
  assert.equal(coraRequests[1].batch.events[0].event_uuid, event.eventId);

  const after = await collectorRequest(collectorBase, '/sync/status');
  assert.equal(after.data.pending, 0, 'un evento confirmado debe salir de la outbox');
  assert.equal(after.data.accepted, 1);

  assert.equal(fs.existsSync(path.join(dataRoot, 'originals')), true,
    'los originales deben seguir persistidos localmente tras la réplica');
  assert.equal(fs.readdirSync(path.join(dataRoot, 'surfaces')).length, 1,
    'la superficie estructural completa debe permanecer local');

  t.diagnostic(JSON.stringify({
    localCollector: 'PASS',
    serviceWorker: 'actual service-worker.js',
    remoteSyncBuilder: 'actual remote-sync.js',
    simulatedCoraStatuses: [401, 200],
    attempts: coraRequests.length,
    pendingOutbox: [before.data.pending, retained.data.pending, after.data.pending],
    accepted: after.data.accepted,
    sameEventUuidOnRetry: true,
    privacyFiltered: true,
    originalAndSurfaceRemainLocal: true,
    node: process.version
  }));
});