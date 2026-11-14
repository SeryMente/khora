'use strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const START = 'client.cycle.started';
const COMPLETE = 'client.cycle.completed';
const LEGACY_COMMON = ['conversation_id','cycle_id','phase','timestamp_utc','monotonic_ms','clock_source','clock_precision_ms','coverage','settle_window_ms'];
const UI_COMMON = [...LEGACY_COMMON,'platform_adapter','metric','measurement_method','start_signal_ids','framework_revision'];
const EVENT_KEYS = ['schema','eventId','sessionId','type','source','capturedAt','payload'];
const UI_SIGNALS = new Set(['aria-busy','data-is-streaming','stop-control','agent-progress']);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + '_must_be_object');
  const actual = Object.keys(value).sort(), allowed = [...expected].sort();
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index])) throw new Error(label + '_contains_unapproved_fields');
}
function validUtc(value) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}
function isUiMetric(payload) {
  return payload?.coverage === 'chatgpt-ui-activity-state-v1' &&
    payload?.platform_adapter === 'chatgpt-web-free' &&
    payload?.metric === 'chatgpt-ui-generation.v1' &&
    payload?.measurement_method === 'ui-activity-transition-v1';
}
function sanitizeCycleEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('cycle_event_invalid');
  exactKeys(event, EVENT_KEYS, 'cycle_event');
  if (event.schema !== 'harmonia.event.v1') throw new Error('cycle_schema_invalid');
  if (!UUID.test(event.eventId) || !UUID.test(event.sessionId)) throw new Error('cycle_event_identity_invalid');
  if (event.type !== START && event.type !== COMPLETE) throw new Error('cycle_type_not_allowed');
  if (event.source !== 'cycle-observer') throw new Error('cycle_source_invalid');
  if (!validUtc(event.capturedAt)) throw new Error('cycle_captured_at_invalid');

  const payload = event.payload;
  const uiMetric = isUiMetric(payload);
  const keys = uiMetric
    ? (event.type === START ? UI_COMMON : [...UI_COMMON,'end_signal_id','duration_ms'])
    : (event.type === START ? LEGACY_COMMON : [...LEGACY_COMMON,'duration_ms']);
  exactKeys(payload, keys, 'cycle_payload');

  if (!UUID_V7.test(payload.conversation_id) || !UUID_V7.test(payload.cycle_id)) throw new Error('cycle_local_identity_must_be_uuidv7');
  if (payload.phase !== (event.type === START ? 'started' : 'completed')) throw new Error('cycle_phase_mismatch');
  if (!validUtc(payload.timestamp_utc) || payload.timestamp_utc !== event.capturedAt) throw new Error('cycle_timestamp_mismatch');
  if (!Number.isFinite(payload.monotonic_ms) || payload.monotonic_ms < 0) throw new Error('cycle_monotonic_invalid');
  if (payload.clock_source !== 'performance.now') throw new Error('cycle_clock_source_invalid');
  if (!Number.isFinite(payload.clock_precision_ms) || payload.clock_precision_ms <= 0 || payload.clock_precision_ms > 1000) throw new Error('cycle_clock_precision_invalid');
  if (payload.settle_window_ms !== 1500) throw new Error('cycle_settle_window_invalid');

  if (uiMetric) {
    if (typeof payload.framework_revision !== 'string' || !/^[A-Za-z0-9._+\/-]{1,100}$/.test(payload.framework_revision)) throw new Error('cycle_framework_revision_invalid');
    if (!Array.isArray(payload.start_signal_ids) || payload.start_signal_ids.length < 1 || payload.start_signal_ids.length > 4 ||
        payload.start_signal_ids.some(signal => !UI_SIGNALS.has(signal)) ||
        new Set(payload.start_signal_ids).size !== payload.start_signal_ids.length) throw new Error('cycle_start_signal_ids_invalid');
    if (event.type === COMPLETE && payload.end_signal_id !== 'processing-indicators-cleared') throw new Error('cycle_end_signal_invalid');
  } else if (payload.coverage !== 'new-dom-node-v1') {
    throw new Error('cycle_coverage_invalid');
  }

  if (event.type === COMPLETE && (!Number.isFinite(payload.duration_ms) || payload.duration_ms < 0)) throw new Error('cycle_duration_invalid');

  return {
    schema: 'harmonia.event.v1',
    eventId: event.eventId,
    sessionId: event.sessionId,
    type: event.type,
    source: 'cycle-observer',
    capturedAt: event.capturedAt,
    payload: Object.fromEntries(keys.map(key => [key, payload[key]]))
  };
}
const DIAGNOSTIC_TRACE = 'diag.cycle.trace';
const DIAGNOSTIC_STAGES = new Set(['observer_started','main_state','signal_state','user_turn_observed','activity_edge','correlation','cycle_decision','cycle_wait','worker_ack']);
const DIAGNOSTIC_SIGNALS = new Set(['aria-busy','data-is-streaming','stop-control','agent-progress']);
const DIAGNOSTIC_KEYS = new Set(['sequence','stage','elapsed_ms','main_present','main_candidate_count','user_seq','user_count','assistant_count','activity','edge','signals','correlation','decision','reason','event_phase','sink_result','delivery','http_status_class']);
function sanitizeCycleDiagnosticEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('cycle_diagnostic_event_invalid');
  exactKeys(event, EVENT_KEYS, 'cycle_diagnostic_event');
  if (event.schema !== 'harmonia.event.v1' || event.type !== DIAGNOSTIC_TRACE ||
      event.source !== 'cycle-observer-diagnostic' || !UUID.test(event.eventId) || !UUID.test(event.sessionId) ||
      !validUtc(event.capturedAt)) throw new Error('cycle_diagnostic_envelope_invalid');
  const payload = event.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('cycle_diagnostic_payload_invalid');
  const actual = Object.keys(payload);
  if (actual.some(key => !DIAGNOSTIC_KEYS.has(key))) throw new Error('cycle_diagnostic_unapproved_fields');
  if (!Number.isInteger(payload.sequence) || payload.sequence < 1 || payload.sequence > 96) throw new Error('cycle_diagnostic_sequence_invalid');
  if (!DIAGNOSTIC_STAGES.has(payload.stage)) throw new Error('cycle_diagnostic_stage_invalid');
  if (!Number.isFinite(payload.elapsed_ms) || payload.elapsed_ms < 0 || payload.elapsed_ms > 86400000) throw new Error('cycle_diagnostic_time_invalid');
  const clean = { sequence:payload.sequence,stage:payload.stage,elapsed_ms:payload.elapsed_ms };
  for (const key of ['main_present','activity']) if (key in payload) {
    if (typeof payload[key] !== 'boolean') throw new Error('cycle_diagnostic_boolean_invalid');
    clean[key] = payload[key];
  }
  for (const key of ['main_candidate_count','user_seq','user_count','assistant_count']) if (key in payload) {
    if (!Number.isInteger(payload[key]) || payload[key] < 0 || payload[key] > 500) throw new Error('cycle_diagnostic_count_invalid');
    clean[key] = payload[key];
  }
  if ('edge' in payload) {
    if (!['rising','falling'].includes(payload.edge)) throw new Error('cycle_diagnostic_edge_invalid');
    clean.edge = payload.edge;
  }
  if ('signals' in payload) {
    if (!Array.isArray(payload.signals) || payload.signals.length > 4) throw new Error('cycle_diagnostic_signals_invalid');
    const seen = new Set();
    clean.signals = payload.signals.map(item => {
      exactKeys(item,['id','matching_count','excluded_count','visible_count'],'cycle_diagnostic_signal');
      if (!DIAGNOSTIC_SIGNALS.has(item.id) || seen.has(item.id)) throw new Error('cycle_diagnostic_signal_id_invalid');
      seen.add(item.id);
      for (const key of ['matching_count','excluded_count','visible_count']) {
        if (!Number.isInteger(item[key]) || item[key] < 0 || item[key] > 500) throw new Error('cycle_diagnostic_signal_count_invalid');
      }
      if (item.excluded_count > item.matching_count || item.visible_count > item.matching_count - item.excluded_count) throw new Error('cycle_diagnostic_signal_count_inconsistent');
      return {id:item.id,matching_count:item.matching_count,excluded_count:item.excluded_count,visible_count:item.visible_count};
    });
  }
  const enums = {
    correlation:['matched','stored_unmatched','expired'],
    decision:['started','completed','rejected','abandoned'],
    reason:['none','no_start_signal','correlation_expired','activity_ended_before_user','missing_assistant','settle_pending','superseded_user_turn','user_node_missing'],
    event_phase:['started','completed','none'],
    sink_result:['accepted','rejected','error'],
    delivery:['posted','queued_outbox','network_error','http_4xx','http_5xx'],
    http_status_class:['2xx','4xx','5xx','none']
  };
  for (const [key,values] of Object.entries(enums)) if (key in payload) {
    if (!values.includes(payload[key])) throw new Error('cycle_diagnostic_enum_invalid');
    clean[key] = payload[key];
  }
  return {
    schema:'harmonia.event.v1',eventId:event.eventId,sessionId:event.sessionId,
    type:DIAGNOSTIC_TRACE,source:'cycle-observer-diagnostic',capturedAt:event.capturedAt,payload:clean
  };
}

function validateCyclePair(start, complete) {
  if (!start || !complete || start.type !== START || complete.type !== COMPLETE) throw new Error('cycle_pair_phase_invalid');
  const a = start.payload, b = complete.payload;
  if (start.sessionId !== complete.sessionId || a.conversation_id !== b.conversation_id || a.cycle_id !== b.cycle_id) throw new Error('cycle_pair_identity_mismatch');
  if (a.clock_source !== b.clock_source || a.clock_precision_ms !== b.clock_precision_ms ||
      a.settle_window_ms !== b.settle_window_ms || a.coverage !== b.coverage) throw new Error('cycle_pair_clock_mismatch');
  if (isUiMetric(a) !== isUiMetric(b)) throw new Error('cycle_pair_metric_mismatch');
  if (isUiMetric(a) && (a.platform_adapter !== b.platform_adapter || a.metric !== b.metric ||
      a.measurement_method !== b.measurement_method || a.framework_revision !== b.framework_revision ||
      JSON.stringify(a.start_signal_ids) !== JSON.stringify(b.start_signal_ids))) throw new Error('cycle_pair_measurement_metadata_mismatch');
  const delta = b.monotonic_ms - a.monotonic_ms;
  if (delta < 0 || !Number.isFinite(delta) || Math.abs(delta - b.duration_ms) > 0.001) throw new Error('cycle_duration_does_not_match_monotonic_clock');
  return true;
}
function percentile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
}
function summarizeCycles(cycles, limit = 12) {
  const entries = Object.entries(cycles && typeof cycles === 'object' ? cycles : {});
  const records = entries.map(([cycleId, item]) => {
    const start = item && item.start || {};
    const complete = item && item.complete || {};
    const legacy = start.payload || {};
    const conversationId = start.conversationId || legacy.conversation_id || null;
    const startedAt = start.startedAt || legacy.timestamp_utc || null;
    const completedAt = complete.completedAt || complete.timestamp_utc || complete.payload?.timestamp_utc || null;
    const durationMs = Number.isFinite(complete.durationMs) ? complete.durationMs :
      Number.isFinite(complete.payload?.duration_ms) ? complete.payload.duration_ms :
      Number.isFinite(item && item.durationMs) ? item.durationMs : null;
    const clockSource = start.clockSource || legacy.clock_source || null;
    const coverage = start.coverage || legacy.coverage || null;
    const metric = start.metric || legacy.metric || (coverage === 'new-dom-node-v1' ? 'observed-turn-duration.v1' : null);
    const measurementMethod = start.measurementMethod || legacy.measurement_method || null;
    const frameworkRevision = start.frameworkRevision || legacy.framework_revision || null;
    const commonValid = item?.state === 'COMPLETED' && UUID_V7.test(String(conversationId || '')) &&
      validUtc(startedAt) && validUtc(completedAt) && Number.isFinite(durationMs) && durationMs >= 0 &&
      clockSource === 'performance.now';
    const uiMeasured = commonValid && coverage === 'chatgpt-ui-activity-state-v1' &&
      metric === 'chatgpt-ui-generation.v1' && measurementMethod === 'ui-activity-transition-v1' && !!frameworkRevision;
    const legacyMeasured = commonValid && coverage === 'new-dom-node-v1';
    return {
      cycleId,
      conversationId: commonValid ? conversationId : null,
      sessionId: start.sessionId || complete.sessionId || null,
      status: uiMeasured ? 'MEASURED' : legacyMeasured ? 'LEGACY_MEASURED' : item?.state === 'STARTED' ? 'INCOMPLETE' : 'NOT_MEASURED',
      metric: uiMeasured ? metric : legacyMeasured ? 'observed-turn-duration.v1' : null,
      startedAt,
      completedAt: commonValid ? completedAt : null,
      durationMs: uiMeasured ? durationMs : null,
      legacyDurationMs: legacyMeasured ? durationMs : null,
      coverage: commonValid ? coverage : null,
      measurementMethod,
      frameworkRevision
    };
  });

  const measured = records.filter(record => record.status === 'MEASURED');
  const legacyMeasured = records.filter(record => record.status === 'LEGACY_MEASURED');
  const durations = measured.map(record => record.durationMs).sort((a, b) => a - b);
  const legacyDurations = legacyMeasured.map(record => record.legacyDurationMs).sort((a, b) => a - b);
  const meanMs = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length * 10) / 10 : null;
  const middle = Math.floor(durations.length / 2);
  const medianMs = !durations.length ? null : durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2;
  const legacyMiddle = Math.floor(legacyDurations.length / 2);
  const legacyMedianMs = !legacyDurations.length ? null : legacyDurations.length % 2 ? legacyDurations[legacyMiddle] : (legacyDurations[legacyMiddle - 1] + legacyDurations[legacyMiddle]) / 2;
  const latest = [...records].sort((a, b) => Date.parse(b.startedAt || '') - Date.parse(a.startedAt || '')).slice(0, Math.max(1, Math.min(50, Math.trunc(limit) || 12)));
  const validCompleted = records.filter(record => record.status === 'MEASURED' || record.status === 'LEGACY_MEASURED');
  return {
    schema: 'harmonia.cycles.v2',
    metric: 'chatgpt-ui-generation.v1',
    frameworkRevision: (() => { const versions = [...new Set(measured.map(record => record.frameworkRevision).filter(Boolean))]; return versions.length === 1 ? versions[0] : versions.length ? 'multiple' : null; })(),
    definition: 'Desde la primera señal gráfica de procesamiento observada hasta la primera transición gráfica de inactividad de la respuesta final; la ventana de asentamiento solo confirma estabilidad y no se suma.',
    notEquivalentTo: 'Tiempo puro de inferencia interna, latencia exclusiva del proveedor ni resolución/aceptación de una tarea que abarque varios turnos.',
    totalCount: records.length,
    completedCount: validCompleted.length,
    measuredCount: measured.length,
    legacyMeasuredCount: legacyMeasured.length,
    activeCount: records.filter(record => record.status === 'INCOMPLETE').length,
    unmeasuredCount: records.filter(record => record.status === 'NOT_MEASURED').length,
    meanMs,
    medianMs,
    p90Ms: percentile(durations, 0.9),
    legacyMedianMs,
    legacyP90Ms: percentile(legacyDurations, 0.9),
    firstMeasuredAt: measured.length ? [...measured].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))[0].startedAt : null,
    lastCompletedAt: measured.length ? [...measured].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0].completedAt : null,
    records: latest
  };
}
module.exports = { START, COMPLETE, DIAGNOSTIC_TRACE, UUID, UUID_V7, sanitizeCycleEvent, sanitizeCycleDiagnosticEvent, validateCyclePair, summarizeCycles };
