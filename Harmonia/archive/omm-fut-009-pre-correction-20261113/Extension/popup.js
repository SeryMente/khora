const $ = selector => document.querySelector(selector);
const toggle = $('#toggle');
let catalog = null;
let diagnosticReportJson = '';
const copyReportButton = $('#copyReport');

async function call(kind, payload = {}) {
  if (!globalThis.chrome?.runtime?.sendMessage) return { ok: false, error: 'Esta vista no está conectada a Chrome.' };
  return new Promise(resolve => chrome.runtime.sendMessage({ kind, ...payload }, response =>
    resolve(response || { ok: false, error: chrome.runtime.lastError?.message || 'Sin respuesta del service worker' })));
}
async function loadCatalog() {
  const response = await fetch(chrome.runtime.getURL('coverage-catalog.json'), { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo leer el catálogo local (' + response.status + ').');
  catalog = await response.json();
  if (!Array.isArray(catalog.features) || !Array.isArray(catalog.sources)) throw new Error('El catálogo local tiene un esquema inválido.');
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return Math.round(ms) + ' ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
  const minutes = Math.floor(ms / 60000), seconds = Math.round((ms % 60000) / 1000);
  return minutes + ' min ' + seconds + ' s';
}
function formatDate(value) {
  if (!value) return 'Sin fecha disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no válida' : date.toLocaleString();
}
function setBar(value) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));
  $('#observedBar').style.width = percentage + '%';
  $('#observedBar').parentElement?.setAttribute('aria-valuenow', String(percentage));
}
function renderCycles(stats, frameworkRevision) {
  const value = stats || {};
  const measured = Number(value.measuredCount) || 0;
  const legacy = Number(value.legacyMeasuredCount) || 0;
  $('#frameworkRevision').textContent = 'Marco: ' + (value.frameworkRevision || frameworkRevision || 'sin etiqueta');
  $('#median').textContent = measured ? formatDuration(value.medianMs) : '—';
  $('#p90').textContent = measured ? formatDuration(value.p90Ms) : '—';
  $('#measured').textContent = String(measured);
  $('#completed').textContent = (Number(value.completedCount) || 0) + ' cerrados · ' + legacy + ' históricos DOM';
  $('#activeCycles').textContent = String(Number(value.activeCount) || 0);
  $('#unmeasured').textContent = String(Number(value.unmeasuredCount) || 0);
  $('#cycleSample').textContent = measured === 1 ? '1 muestra gráfica' : measured > 1 ? measured + ' muestras gráficas' : 'Sin muestra gráfica';
  $('#lastCycle').textContent = value.lastCompletedAt
    ? 'Último ciclo gráfico medido: ' + formatDate(value.lastCompletedAt)
    : 'Aún no hay ciclos gráficos medidos.';
  const list = $('#recentCycles');
  list.replaceChildren();
  const records = Array.isArray(value.records) ? value.records : [];
  if (!records.length) { list.textContent = 'Sin registros todavía.'; return; }
  for (const record of records.slice(0, 10)) {
    const row = document.createElement('div'); row.className = 'recent-row';
    const left = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = record.status === 'MEASURED' ? 'Generación medida'
      : record.status === 'LEGACY_MEASURED' ? 'Histórico DOM'
      : record.status === 'INCOMPLETE' ? 'Sin cierre' : 'No medido';
    const when = document.createElement('small'); when.textContent = formatDate(record.startedAt);
    left.append(label, when);
    const duration = document.createElement('strong');
    duration.textContent = record.status === 'MEASURED' ? formatDuration(record.durationMs)
      : record.status === 'LEGACY_MEASURED' ? formatDuration(record.legacyDurationMs) : '—';
    row.append(left, duration); list.append(row);
  }
}
function renderCoverage(coverage, localOnly = false) {
  const value = coverage || {};
  const isLocal = localOnly && value.source === 'local-outbox';
  const natural = value.naturalObservation || {};
  const docs = value.documentation || {};
  const localIds = new Set(Array.isArray(value.observedFeatureIds) ? value.observedFeatureIds : []);
  const total = Number(value.featureCount) || catalog?.features?.length || 0;
  const observedCount = isLocal ? localIds.size : (Number(natural.covered) || 0);
  const observedPct = isLocal ? (total ? Math.round(observedCount / total * 100) : 0) : (Number(natural.percent) || 0);
  const docsCount = (catalog?.features || []).filter(feature => Array.isArray(feature.docs) && feature.docs.length > 0).length;
  const docsPct = isLocal ? (total ? Math.round(docsCount / total * 100) : 0) : (Number(docs.percent) || 0);
  setBar(observedPct);
  $('#observedPercent').textContent = observedPct + '%';
  $('#docsPercent').textContent = docsPct + '%';
  $('#naturalLabel').textContent = isLocal ? 'Superficie local · pendiente natural' : 'Observación natural';
  $('#naturalPercent').textContent = observedPct + '%';
  $('#surfaces').textContent = String(Number(value.uniqueSurfaceCount) || 0);
  $('#features').textContent = observedCount + ' / ' + total;
  $('#unknown').textContent = value.unknownControlCount == null ? '—' : String(Number(value.unknownControlCount) || 0);
  $('#scans').textContent = String(Number(value.scanCount) || 0);
  $('#lastScan').textContent = value.lastScanAt
    ? (isLocal ? 'Último barrido local: ' : 'Último barrido: ') + formatDate(value.lastScanAt)
    : (isLocal ? 'Aún no hay barridos en la cola local.' : 'Aún no hay un barrido natural.');
  const pending = $('#pendingList'); pending.replaceChildren();
  const ids = isLocal
    ? (catalog?.features || []).map(feature => feature.id).filter(id => !localIds.has(id))
    : (Array.isArray(value.pendingObservationIds) ? value.pendingObservationIds : []);
  const labels = new Map((catalog?.features || []).map(feature => [feature.id, feature.label]));
  if (!ids.length) { pending.textContent = 'No hay capacidades pendientes de observación en el catálogo actual.'; return; }
  for (const id of ids.slice(0, 20)) {
    const line = document.createElement('div'); line.className = 'pending-row';
    line.textContent = (labels.get(id) || id) + ' · ' + id; pending.append(line);
  }
  if (ids.length > 20) {
    const more = document.createElement('small'); more.textContent = 'Y ' + (ids.length - 20) + ' pendientes más.'; pending.append(more);
  }
}
function buildDiagnosticReport(state) {
  const coverage = state.coverage || {};
  const cycles = state.cycles || {};
  const isLocal = !state.collector || coverage.source === 'local-outbox';
  const features = Array.isArray(catalog?.features) ? catalog.features : [];
  const featureCount = Number(coverage.featureCount) || features.length;
  const observedFeatureIds = [...new Set(Array.isArray(coverage.observedFeatureIds) ? coverage.observedFeatureIds : [])]
    .filter(id => typeof id === 'string').sort();
  const pendingObservationIds = Array.isArray(coverage.pendingObservationIds)
    ? coverage.pendingObservationIds.filter(id => typeof id === 'string')
    : isLocal ? features.map(feature => feature.id).filter(id => !observedFeatureIds.includes(id)) : [];
  const natural = coverage.naturalObservation || {};
  const documentation = coverage.documentation || {};
  const observedCount = isLocal ? observedFeatureIds.length : (Number(natural.covered) || 0);
  const documentationCount = Number(documentation.covered) ||
    features.filter(feature => Array.isArray(feature.docs) && feature.docs.length > 0).length;
  const observedPercent = isLocal
    ? (featureCount ? Math.round(observedCount / featureCount * 100) : 0)
    : (Number(natural.percent) || 0);
  const documentationPercent = isLocal
    ? (featureCount ? Math.round(documentationCount / featureCount * 100) : 0)
    : (Number(documentation.percent) || 0);
  const finiteOrNull = value => value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  const records = (Array.isArray(cycles.records) ? cycles.records : []).slice(0, 10).map(record => ({
    status: String(record.status || 'UNKNOWN'),
    durationMs: finiteOrNull(record.durationMs),
    startedAt: record.startedAt || null,
    completedAt: record.completedAt || null,
    frameworkRevision: record.frameworkRevision || cycles.frameworkRevision || state.frameworkRevision || null
  }));
  const sync = state.repositorySync || {};
  return {
    schema: 'harmonia.diagnostic-report.v1',
    generatedAt: new Date().toISOString(),
    extension: {
      name: 'Harmonia',
      version: String(state.version || 'unknown'),
      frameworkRevision: String(state.frameworkRevision || cycles.frameworkRevision || 'unknown')
    },
    observation: {
      enabled: !!state.autoEnabled,
      active: !!state.active,
      activeTabs: Number(state.activeTabs) || 0,
      collectorAvailable: !!state.collector
    },
    queue: {
      persistedEventCount: Number(state.events) || 0,
      pendingEventCount: Number(state.pendingEvents) || 0,
      pendingBytes: Number(state.pendingBytes) || 0
    },
    cycles: {
      metric: String(cycles.metric || 'chatgpt-ui-generation.v1'),
      totalCount: Number(cycles.totalCount) || 0,
      completedCount: Number(cycles.completedCount) || 0,
      measuredCount: Number(cycles.measuredCount) || 0,
      activeCount: Number(cycles.activeCount) || 0,
      unmeasuredCount: Number(cycles.unmeasuredCount) || 0,
      meanMs: finiteOrNull(cycles.meanMs),
      medianMs: finiteOrNull(cycles.medianMs),
      p90Ms: finiteOrNull(cycles.p90Ms),
      lastCompletedAt: cycles.lastCompletedAt || null,
      records
    },
    coverage: {
      source: isLocal ? 'local-outbox' : 'collector',
      scanCount: Number(coverage.scanCount) || 0,
      uniqueSurfaceCount: Number(coverage.uniqueSurfaceCount) || 0,
      observedFeatureCount: observedCount,
      featureCount,
      observedPercent,
      documentationFeatureCount: documentationCount,
      documentationPercent,
      unknownControlCount: coverage.unknownControlCount == null ? null : Number(coverage.unknownControlCount),
      lastScanAt: coverage.lastScanAt || null,
      observedFeatureIds,
      pendingObservationIds
    },
    repositorySync: {
      status: sync.status || 'unknown',
      checkedAt: sync.checkedAt || null,
      localVersion: sync.localVersion || state.version || null,
      remoteVersion: sync.remoteVersion || null,
      updateAvailable: sync.updateAvailable ?? null,
      catalogUpdateAvailable: sync.catalogUpdateAvailable ?? null,
      metadataUnavailable: !!sync.metadataUnavailable
    },
    diagnostics: {
      lastError: state.lastError ? String(state.lastError).slice(0, 240) : null,
      cycleObserver: state.cycleDiagnostics || null,
      cycleTrace: state.cycleTraceDiagnostics ? {
        source: state.cycleTraceDiagnostics.source || 'collector',
        totalCount: Number(state.cycleTraceDiagnostics.totalCount) || 0,
        byStage: state.cycleTraceDiagnostics.byStage || {},
        deliveryCounts: state.cycleTraceDiagnostics.deliveryCounts || {},
        lastAt: state.cycleTraceDiagnostics.lastAt || null,
        lastStage: state.cycleTraceDiagnostics.lastStage || null
      } : null
    },
    privacy: {
      messageContentIncluded: false,
      credentialsIncluded: false,
      sessionIdentifiersIncluded: false,
      rawEventPayloadsIncluded: false
    }
  };
}
function exposeDiagnosticReport(state) {
  const report = buildDiagnosticReport(state);
  diagnosticReportJson = JSON.stringify(report, null, 2);
  globalThis.__HARMONIA_DIAGNOSTIC_REPORT__ = report;
  globalThis.__HARMONIA_DIAGNOSTIC_REPORT_JSON__ = diagnosticReportJson;
  $('#reportPayload').textContent = diagnosticReportJson;
  copyReportButton.disabled = false;
  $('#copyStatus').textContent = 'Informe listo · disponible también para automatización headless.';
}
async function paint() {
  try {
    if (!catalog) await loadCatalog();
    const response = await call('harmonia:get');
    if (!response.ok) throw new Error(response.error || 'No se pudo leer el estado de Harmonia.');
    const state = response.value || {};
    $('#dot').className = 'status-dot ' + (state.autoEnabled ? 'online' : 'paused');
    $('#headline').textContent = !state.autoEnabled ? 'Observación pausada'
      : state.collector ? 'Observación activa'
      : Number(state.pendingEvents) > 0 ? 'Observación local activa · cola pendiente'
      : 'Observación local activa';
    $('#detail').textContent = !state.autoEnabled ? 'La observación está pausada.'
      : state.collector ? 'ChatGPT observado en ' + (Number(state.activeTabs) || 0) + ' pestañas. Cola pendiente: ' + (Number(state.pendingEvents) || 0) + '.'
      : 'Los eventos se guardan de forma local en Chrome y se enviarán al colector cuando esté disponible. Cola pendiente: ' + (Number(state.pendingEvents) || 0) + '.';
    toggle.textContent = state.autoEnabled ? 'Pausar observación' : 'Reanudar observación';
    toggle.className = state.autoEnabled ? 'stop' : '';
    toggle.disabled = false;
    renderCycles(state.cycles, state.frameworkRevision);
    renderCoverage(state.coverage, !state.collector);
    $('#events').textContent = (Number(state.events) || 0) + ' persistidos · ' + (Number(state.pendingEvents) || 0) + ' en cola';
    $('#storage').textContent = 'Datos en este dispositivo';
    const sync = state.repositorySync;
    const diagnostic = [state.lastError, sync?.error].filter(Boolean);
    $('#diagnostic').textContent = diagnostic.length ? diagnostic.join(' · ') : 'Sin incidencias reportadas.';
    exposeDiagnosticReport(state);
  } catch (error) {
    $('#dot').className = 'status-dot offline';
    $('#headline').textContent = 'No se pudo leer Harmonia';
    $('#detail').textContent = String(error.message || error);
    $('#diagnostic').textContent = String(error.message || error);
    copyReportButton.disabled = true;
    $('#copyStatus').textContent = 'Informe no disponible: no se pudo leer el estado.';
    toggle.disabled = true; toggle.textContent = 'Colector no disponible';
  }
}
toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  const status = await call('harmonia:get');
  if (!status.ok) { await paint(); return; }
  const response = await call('harmonia:set-auto', { enabled: !status.value?.autoEnabled });
  if (!response.ok) $('#diagnostic').textContent = response.error || 'No se pudo cambiar la observación.';
  await paint();
});
$('#refresh').addEventListener('click', () => void paint());
copyReportButton.addEventListener('click', async () => {
  if (!diagnosticReportJson) {
    $('#copyStatus').textContent = 'El informe todavía no está disponible.';
    return;
  }
  copyReportButton.disabled = true;
  $('#copyStatus').textContent = 'Copiando informe…';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(diagnosticReportJson);
    } else {
      const field = document.createElement('textarea');
      field.value = diagnosticReportJson;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('El navegador no permitió copiar al portapapeles.');
    }
    copyReportButton.textContent = 'Copiado ✓';
    $('#copyStatus').textContent = 'Informe copiado · ' + diagnosticReportJson.length.toLocaleString() + ' caracteres.';
  } catch (error) {
    $('#copyStatus').textContent = 'No se pudo copiar: ' + String(error.message || error);
  } finally {
    copyReportButton.disabled = false;
  }
});
let activeConversationTabId = null;

function renderFrontRows(rows) {
  const target = $('#frontResults');
  target.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'front-empty';
    empty.textContent = 'No hay frentes con actividad registrada en esta ventana.';
    target.append(empty);
    return;
  }
  for (const item of rows) {
    const row = document.createElement('div');
    row.className = 'front-row';
    const name = document.createElement('strong');
    name.textContent = String(item.frontName || 'Frente sin nombre');
    const when = document.createElement('small');
    when.textContent = [item.relativeLabel, item.absoluteLabel].filter(Boolean).join(' · ');
    const link = document.createElement('a');
    link.href = String(item.conversationUrl || '');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = String(item.conversationUrl || '');
    if (!/^https:\/\/chatgpt\.com\/(?:c|g)\/[0-9a-f-]{36}(?:\/c\/[0-9a-f-]{36})?$/i.test(link.href)) {
      link.removeAttribute('href');
      link.textContent = 'URL no disponible';
    }
    row.append(name, when, link);
    target.append(row);
  }
}

async function refreshFrontReport() {
  const windowId = $('#frontWindow').value || '24h';
  $('#frontResults').textContent = 'Actualizando…';
  try {
    const response = await call('harmonia:front-report', { windowId });
    if (!response.ok) throw new Error(response.error || 'No se pudo consultar el listado.');
    const report = response.value;
    if (!report?.ok) throw new Error(report?.error || 'El listado no está disponible.');
    renderFrontRows(report.rows);
  } catch (error) {
    const target = $('#frontResults');
    target.textContent = 'No se pudo actualizar el listado: ' + String(error.message || error);
  }
}

async function loadFrontContext() {
  const select = $('#frontSelect');
  const assign = $('#assignFront');
  const info = $('#frontConversation');
  try {
    const tabs = await new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
    const tab = tabs?.[0];
    activeConversationTabId = tab?.id ?? null;
    if (!Number.isInteger(activeConversationTabId)) throw new Error('No se encontró una pestaña activa.');
    const response = await call('harmonia:front-context', { tabId: activeConversationTabId });
    if (!response.ok) throw new Error(response.error || 'No se pudo leer la conversación activa.');
    const context = response.value || {};
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona un frente';
    select.append(placeholder);
    for (const front of context.fronts || []) {
      const option = document.createElement('option');
      option.value = front.id;
      option.textContent = front.name;
      select.append(option);
    }
    if (!context.ok || !context.conversation) {
      info.textContent = 'Abre una conversación de ChatGPT para asociarla a un frente.';
      assign.disabled = true;
      return;
    }
    info.textContent = context.conversation.url;
    select.value = context.assignment?.frontId || '';
    assign.disabled = false;
    $('#frontStatus').textContent = context.assignment
      ? 'Asociada a ' + context.assignment.frontName + '.'
      : 'La conversación todavía no está asociada a un frente.';
  } catch (error) {
    info.textContent = String(error.message || error);
    assign.disabled = true;
  }
}

$('#assignFront').addEventListener('click', async () => {
  const frontId = $('#frontSelect').value;
  if (!frontId || !Number.isInteger(activeConversationTabId)) {
    $('#frontStatus').textContent = 'Selecciona un frente y abre su conversación.';
    return;
  }
  const button = $('#assignFront');
  button.disabled = true;
  $('#frontStatus').textContent = 'Guardando asociación…';
  try {
    const response = await call('harmonia:assign-front', { tabId: activeConversationTabId, frontId });
    if (!response.ok) throw new Error(response.error || 'No se pudo guardar la asociación.');
    const result = response.value;
    if (!result?.ok) throw new Error(result?.error || 'No se pudo guardar la asociación.');
    $('#frontStatus').textContent = 'Conversación asociada a ' + result.assignment.frontName + '.';
    await refreshFrontReport();
  } catch (error) {
    $('#frontStatus').textContent = String(error.message || error);
  } finally {
    button.disabled = false;
  }
});
$('#frontWindow').addEventListener('change', () => void refreshFrontReport());
$('#refreshFronts').addEventListener('click', () => void refreshFrontReport());
void loadFrontContext();
void refreshFrontReport();
void paint();
