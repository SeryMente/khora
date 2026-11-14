import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { validateEvidenceEnvelope, isEvidenceSufficient } from './evidence-validator.mjs';
import { routeCognitiveTask } from './cognitive-router.mjs';

const catalog = JSON.parse(await readFile(new URL('./scenarios.json', import.meta.url), 'utf8'));
const SIGNAL_IDS = Object.freeze(['aria-busy', 'data-is-streaming', 'stop-control', 'agent-progress']);
const DIAG_COUNTERS = Object.freeze([
  'reconcileCount', 'userTurnNodesObserved', 'activityTrueSnapshots', 'activityRisingEdges',
  'activityFallingEdges', 'unmatchedActivityEdges', 'userActivityCorrelationAttempts',
  'successfulCorrelations', 'staleActivityEdges', 'cycleStartAttempts', 'cycleStartedEvents',
  'cycleStartRejectedNoSignals', 'cycleCompletedEvents', 'eventSinkAttempts',
  'eventSinkAccepted', 'eventSinkRejected', 'eventSinkErrors'
]);
const DIAGNOSIS_CODES = Object.freeze([
  'root_missing', 'user_node_missing', 'signal_not_visible', 'no_rising_edge',
  'correlation_timeout', 'start_rejected_no_signal', 'sink_rejected', 'sink_error',
  'worker_or_persistence_mismatch', 'coverage_gap', 'insufficient_evidence'
]);
const EVIDENCE_FIELDS = Object.freeze([
  'observer.queriedTabCount', 'observer.reportingTabCount',
  'observer.snapshotCount', 'observer.mainFoundCount', 'observer.rootPresentInstances',
  'observer.userMessageNodesLastSnapshot', 'observer.assistantMessageNodesLastSnapshot',
  'observer.activityInstances', ...DIAG_COUNTERS.map(key => 'observer.' + key),
  'observer.visibleSignalCount', 'observer.matchingSignalCount',
  'cycles.totalCount', 'cycles.completedCount', 'cycles.measuredCount',
  'cycles.activeCount', 'cycles.unmeasuredCount', 'coverage.observedFeatureCount',
  'coverage.featureCount', 'queue.pendingEventCount'
]);
const RESULT_PROPERTIES = {
  schema: { type: 'string', const: 'harmonia.dev-triage-result.v1' },
  diagnosis_code: { type: 'string', enum: DIAGNOSIS_CODES },
  confidence: { type: 'number', minimum: 0, maximum: 1 },
  evidence_refs: { type: 'array', items: { type: 'string', enum: EVIDENCE_FIELDS }, maxItems: 6 },
  alternative_codes: { type: 'array', items: { type: 'string', enum: DIAGNOSIS_CODES }, maxItems: 4 },
  scenario_id: { type: 'string', enum: catalog.scenarios.map(item => item.id) },
  expected_observation: { type: 'string' },
  falsification_condition: { type: 'string' },
  reason_summary: { type: 'string' }
};
export const RESULT_SCHEMA = Object.freeze({
  type: 'object',
  properties: RESULT_PROPERTIES,
  required: Object.keys(RESULT_PROPERTIES),
  additionalProperties: false
});

const asCount = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1_000_000, Math.trunc(number))) : 0;
};
const asMs = value => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(86_400_000, Math.round(number * 10) / 10) : null;
};
const asPercent = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number * 10) / 10)) : 0;
};
const safeVersion = value => typeof value === 'string' && /^[0-9A-Za-z.+_-]{1,64}$/.test(value) ? value : 'unknown';
const safeFramework = value => typeof value === 'string' && /^[0-9A-Za-z.+_-]{1,96}$/.test(value) ? value : 'unknown';

export function compileEvidence(report) {
  if (!report || report.schema !== 'harmonia.diagnostic-report.v1') {
    throw new TypeError('diagnostic_report_schema_invalid');
  }
  const state = report.diagnostics?.cycleObserver || {};
  const totals = state.totals || {};
  const rawObserver = totals.observer || {};
  const rawSnapshot = totals.snapshot || {};
  const instances = Array.isArray(state.instances) ? state.instances : [];
  const signalPresenceTotals = {};
  for (const signalId of SIGNAL_IDS) {
    const value = rawSnapshot.signalPresence?.[signalId] || {};
    signalPresenceTotals[signalId] = {
      matchingCount: asCount(value.matchingCount),
      visibleCount: asCount(value.visibleCount)
    };
  }
  const rootPresentInstances = instances.filter(item => item?.snapshot?.lastRootFound === true).length;
  const activityInstances = instances.filter(item => item?.snapshot?.lastActivity === true).length;
  const userMessageNodesLastSnapshot = instances.reduce((sum, item) => sum + asCount(item?.snapshot?.lastUserMessageCount), 0);
  const assistantMessageNodesLastSnapshot = instances.reduce((sum, item) => sum + asCount(item?.snapshot?.lastAssistantMessageCount), 0);
  const matchingSignalCount = Object.values(signalPresenceTotals).reduce((sum, item) => sum + item.matchingCount, 0);
  const visibleSignalCount = Object.values(signalPresenceTotals).reduce((sum, item) => sum + item.visibleCount, 0);
  const observedSignalIds = [...new Set(instances.flatMap(item =>
    Array.isArray(item?.snapshot?.lastSignalIds)
      ? item.snapshot.lastSignalIds.filter(signal => SIGNAL_IDS.includes(signal))
      : []
  ))].sort();

  return {
    schema: 'harmonia.dev-triage-input.v1',
    contractVersion: '1.0',
    extension: {
      version: safeVersion(report.extension?.version),
      frameworkRevision: safeFramework(report.extension?.frameworkRevision)
    },
    observation: {
      enabled: report.observation?.enabled === true,
      active: report.observation?.active === true,
      activeTabCount: asCount(report.observation?.activeTabs),
      collectorAvailable: report.observation?.collectorAvailable === true
    },
    queue: {
      persistedEventCount: asCount(report.queue?.persistedEventCount),
      pendingEventCount: asCount(report.queue?.pendingEventCount),
      pendingBytes: asCount(report.queue?.pendingBytes)
    },
    cycles: {
      totalCount: asCount(report.cycles?.totalCount),
      completedCount: asCount(report.cycles?.completedCount),
      measuredCount: asCount(report.cycles?.measuredCount),
      activeCount: asCount(report.cycles?.activeCount),
      unmeasuredCount: asCount(report.cycles?.unmeasuredCount),
      medianMs: asMs(report.cycles?.medianMs),
      p90Ms: asMs(report.cycles?.p90Ms)
    },
    coverage: {
      scanCount: asCount(report.coverage?.scanCount),
      uniqueSurfaceCount: asCount(report.coverage?.uniqueSurfaceCount),
      observedFeatureCount: asCount(report.coverage?.observedFeatureCount),
      featureCount: asCount(report.coverage?.featureCount),
      observedPercent: asPercent(report.coverage?.observedPercent)
    },
    observer: {
      queriedTabCount: asCount(state.queriedTabCount),
      reportingTabCount: asCount(state.reportingTabCount),
      snapshotCount: asCount(rawSnapshot.snapshotCount),
      mainFoundCount: asCount(rawSnapshot.mainFoundCount),
      rootPresentInstances,
      userMessageNodesLastSnapshot,
      assistantMessageNodesLastSnapshot,
      activityInstances,
      ...Object.fromEntries(DIAG_COUNTERS.map(key => [key, asCount(rawObserver[key])])),
      visibleSignalCount,
      matchingSignalCount,
      observedSignalIds,
      signalPresenceTotals
    }
  };
}

function hasValueAtPath(object, path) {
  return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object) !== undefined;
}
function safeSentence(value, maxLength) {
  if (typeof value !== 'string') throw new TypeError('triage_text_field_invalid');
  const normalized = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maxLength || /https?:\/\/|[A-Za-z]:\\/i.test(normalized)) {
    throw new TypeError('triage_text_field_rejected');
  }
  return normalized;
}

export function validateModelResult(result, input) {
  const expected = Object.keys(RESULT_PROPERTIES).sort();
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new TypeError('triage_result_invalid');
  const actual = Object.keys(result).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError('triage_result_fields_invalid');
  }
  if (result.schema !== 'harmonia.dev-triage-result.v1') throw new TypeError('triage_result_schema_invalid');
  if (!DIAGNOSIS_CODES.includes(result.diagnosis_code)) throw new TypeError('triage_diagnosis_code_invalid');
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new TypeError('triage_confidence_invalid');
  if (!Array.isArray(result.evidence_refs) || result.evidence_refs.length > 6 ||
      new Set(result.evidence_refs).size !== result.evidence_refs.length ||
      result.evidence_refs.some(path => !EVIDENCE_FIELDS.includes(path) || !hasValueAtPath(input, path))) {
    throw new TypeError('triage_evidence_refs_invalid');
  }
  if (!Array.isArray(result.alternative_codes) || result.alternative_codes.length > 4 ||
      new Set(result.alternative_codes).size !== result.alternative_codes.length ||
      result.alternative_codes.some(code => !DIAGNOSIS_CODES.includes(code))) {
    throw new TypeError('triage_alternative_codes_invalid');
  }
  if (!catalog.scenarios.some(item => item.id === result.scenario_id)) throw new TypeError('triage_scenario_id_invalid');
  return {
    schema: result.schema,
    diagnosis_code: result.diagnosis_code,
    confidence: result.confidence,
    evidence_refs: [...result.evidence_refs],
    alternative_codes: [...result.alternative_codes],
    scenario_id: result.scenario_id,
    expected_observation: safeSentence(result.expected_observation, 220),
    falsification_condition: safeSentence(result.falsification_condition, 220),
    reason_summary: safeSentence(result.reason_summary, 260)
  };
}

function fallbackResult(diagnosis, scenarioId, confidence, evidence, reason, alternatives = []) {
  const scenario = catalog.scenarios.find(item => item.id === scenarioId) || catalog.scenarios.find(item => item.id === 'INSUFFICIENT_EVIDENCE');
  return {
    schema: 'harmonia.dev-triage-result.v1',
    diagnosis_code: diagnosis,
    confidence,
    evidence_refs: evidence.filter(path => EVIDENCE_FIELDS.includes(path)).slice(0, 6),
    alternative_codes: alternatives.filter(code => DIAGNOSIS_CODES.includes(code)).slice(0, 4),
    scenario_id: scenario.id,
    expected_observation: scenario.discriminator,
    falsification_condition: 'The specified counters contradict this hypothesis or the next local test passes without reproducing it.',
    reason_summary: reason
  };
}

export function fallbackTriage(input, reasonCode = 'groq_not_used') {
  const o = input.observer;
  const visibleSignals = o.visibleSignalCount;
  const matchingSignals = o.matchingSignalCount;
  if (o.reportingTabCount === 0 || o.snapshotCount === 0) {
    return fallbackResult('insufficient_evidence', 'INSUFFICIENT_EVIDENCE', 0.42,
      ['observer.reportingTabCount', 'observer.snapshotCount'],
      'No active content-script diagnostics are available; do not infer a selector defect.');
  }
  if (o.mainFoundCount === 0) {
    return fallbackResult('root_missing', 'ROOT_NOT_FOUND', 0.9,
      ['observer.snapshotCount', 'observer.mainFoundCount'],
      'Snapshots are running but no main region was found.');
  }
  if (o.userTurnNodesObserved === 0 && o.userMessageNodesLastSnapshot === 0) {
    return fallbackResult('user_node_missing', 'USER_NODE_MISSING', 0.72,
      ['observer.userTurnNodesObserved', 'observer.userMessageNodesLastSnapshot'],
      'No user message node was observed in the available structural snapshots.');
  }
  if (visibleSignals > 0 && o.userTurnNodesObserved > 0 && o.activityRisingEdges === 0 && o.staleActivityEdges === 0) {
    return fallbackResult('no_rising_edge', 'NO_RISING_EDGE', 0.76,
      ['observer.userTurnNodesObserved', 'observer.activityRisingEdges', 'observer.visibleSignalCount'],
      'User turns and visible processing signals exist, but no inactive-to-active edge has been counted.');
  }
  if (visibleSignals === 0 && matchingSignals > 0) {
    return fallbackResult('signal_not_visible', 'SIGNAL_NOT_VISIBLE', 0.82,
      ['observer.matchingSignalCount', 'observer.visibleSignalCount'],
      'Allowlisted processing selectors match elements, but none is visible.');
  }
  if (visibleSignals === 0 && o.userTurnNodesObserved > 0) {
    return fallbackResult('no_rising_edge', 'NO_RISING_EDGE', 0.72,
      ['observer.userTurnNodesObserved', 'observer.activityRisingEdges', 'observer.visibleSignalCount'],
      'User turns were observed but the observer has not recorded a visible processing edge.');
  }
  if (o.staleActivityEdges > 0 && o.successfulCorrelations === 0) {
    return fallbackResult('correlation_timeout', 'CORRELATION_ORDER', 0.86,
      ['observer.unmatchedActivityEdges', 'observer.userActivityCorrelationAttempts', 'observer.staleActivityEdges'],
      'Processing edges expired before a user-turn correlation was completed.');
  }
  if (o.cycleStartRejectedNoSignals > 0) {
    return fallbackResult('start_rejected_no_signal', 'START_REJECTED', 0.95,
      ['observer.cycleStartAttempts', 'observer.cycleStartRejectedNoSignals'],
      'T1 start was attempted but rejected because no allowlisted signal remained.');
  }
  if (o.eventSinkRejected > 0) {
    return fallbackResult('sink_rejected', 'SINK_FAILURE', 0.9,
      ['observer.eventSinkAttempts', 'observer.eventSinkRejected'],
      'The event sink explicitly rejected one or more cycle events.');
  }
  if (o.eventSinkErrors > 0) {
    return fallbackResult('sink_error', 'SINK_FAILURE', 0.9,
      ['observer.eventSinkAttempts', 'observer.eventSinkErrors'],
      'The event sink raised an error while forwarding a cycle event.');
  }
  if (o.cycleStartedEvents > 0 && o.eventSinkAccepted > 0 && input.cycles.totalCount === 0) {
    return fallbackResult('worker_or_persistence_mismatch', 'WORKER_PERSISTENCE', 0.82,
      ['observer.cycleStartedEvents', 'observer.eventSinkAccepted', 'cycles.totalCount'],
      'The observer emitted and the sink accepted T1, but no cycle is visible in the current aggregate.');
  }
  if (o.cycleStartedEvents > o.cycleCompletedEvents) {
    return fallbackResult('insufficient_evidence', 'T2_SETTLE', 0.58,
      ['observer.cycleStartedEvents', 'observer.cycleCompletedEvents', 'cycles.activeCount'],
      'A T1 start exists, but the available evidence does not yet establish a completed T2.');
  }
  return fallbackResult('insufficient_evidence', 'INSUFFICIENT_EVIDENCE', 0.35,
    ['observer.reportingTabCount', 'observer.cycleStartedEvents', 'cycles.totalCount'],
    'No high-confidence actionable failure is visible. Preserve the deterministic local path.');
}

export async function runAssist({ report, env = process.env, fetchImpl = fetch }) {
  const started = performance.now();
  // Validate the complete outbound envelope before routing or constructing an API payload.
  const input = validateEvidenceEnvelope(compileEvidence(report));
  const apiKey = typeof env.GROQ_API_KEY === 'string' ? env.GROQ_API_KEY.trim() : '';
  const localResult = fallbackTriage(input);
  const routing = routeCognitiveTask({
    taskType: 'diagnostic_triage',
    evidenceSufficient: isEvidenceSufficient(input),
    localActionable: localResult.scenario_id !== 'INSUFFICIENT_EVIDENCE',
    localConfidence: localResult.confidence,
    groqAvailable: apiKey.length > 0,
    risk: 'low'
  });
  const duration = () => Math.round((performance.now() - started) * 10) / 10;
  const local = (reasonCode, route = routing) => ({
    schema: 'harmonia.groq-assist-run.v1',
    provider: 'local-fallback',
    model: null,
    fallbackReason: reasonCode,
    durationMs: duration(),
    tokenUsage: null,
    routing: route,
    input,
    result: localResult
  });

  if (!routing.invokeGroq) {
    let reasonCode = 'local_fallback';
    if (routing.route === 'collect_more_evidence') reasonCode = 'insufficient_evidence';
    else if (routing.route === 'local_deterministic') reasonCode = 'local_diagnosis_conclusive';
    else if (!apiKey) reasonCode = 'api_key_unavailable';
    return local(reasonCode);
  }

  const userPayload = {
    evidence: input,
    allowedScenarios: catalog.scenarios.map(({ id, diagnosisCode, description, discriminator }) =>
      ({ id, diagnosisCode, description, discriminator }))
  };
  try {
    const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        reasoning_effort: 'low',
        temperature: 0,
        stream: false,
        max_completion_tokens: 900,
        messages: [
          {
            role: 'system',
            content: 'You are Harmonia Engineering Analyst. Analyze only the supplied numeric and categorical structural diagnostics. Choose the most discriminating existing scenario. Do not propose commands, execute code, infer conversation content, invent evidence, or request more sensitive data. Cite only evidence_refs present in the input. If evidence is weak, choose insufficient_evidence. Never recommend changing selectors without a discriminating local test.'
          },
          { role: 'user', content: JSON.stringify(userPayload) }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'harmonia_dev_triage_result',
            strict: true,
            schema: RESULT_SCHEMA
          }
        }
      }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) {
      return local('groq_http_' + response.status, {
        ...routing, route: 'local_fallback', invokeGroq: false, reasonCode: 'groq_http_error'
      });
    }
    const payload = await response.json();
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      return local('groq_response_missing_content', {
        ...routing, route: 'local_fallback', invokeGroq: false, reasonCode: 'groq_response_invalid'
      });
    }
    const result = validateModelResult(JSON.parse(text), input);
    const usage = payload.usage || {};
    return {
      schema: 'harmonia.groq-assist-run.v1',
      provider: 'groq',
      model: 'openai/gpt-oss-20b',
      fallbackReason: null,
      durationMs: duration(),
      tokenUsage: {
        promptTokens: asCount(usage.prompt_tokens),
        completionTokens: asCount(usage.completion_tokens),
        totalTokens: asCount(usage.total_tokens)
      },
      routing,
      input,
      result
    };
  } catch (error) {
    const reason = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? 'groq_timeout'
      : error instanceof SyntaxError ? 'groq_invalid_structured_response' : 'groq_request_failed';
    return local(reason, {
      ...routing, route: 'local_fallback', invokeGroq: false, reasonCode: reason
    });
  }
}

async function readInput(inputPath) {
  const text = inputPath ? await readFile(inputPath, 'utf8') : await new Promise((resolve, reject) => {
    let value = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { value += chunk; });
    process.stdin.on('end', () => resolve(value));
    process.stdin.on('error', reject);
  });
  return JSON.parse(text);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find(value => !value.startsWith('--'));
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
  const forceLocal = args.includes('--local-only');
  const report = await readInput(inputPath);
  const run = await runAssist({
    report,
    env: forceLocal ? {} : process.env
  });
  const output = JSON.stringify(run, null, 2) + '\n';
  if (outputPath) await writeFile(outputPath, output, { encoding: 'utf8', flag: 'w' });
  process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const reason = error instanceof SyntaxError ? 'input_json_invalid' : 'triage_input_invalid';
    process.stderr.write(reason + '\n');
    process.exitCode = 1;
  });
}
