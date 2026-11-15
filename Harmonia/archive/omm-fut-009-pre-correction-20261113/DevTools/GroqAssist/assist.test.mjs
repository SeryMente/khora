import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileEvidence, fallbackTriage, runAssist, validateModelResult, RESULT_SCHEMA
} from './assist.mjs';

function reportFixture(overrides = {}) {
  return {
    schema: 'harmonia.diagnostic-report.v1',
    generatedAt: '2026-11-11T15:00:00.000Z',
    extension: { name: 'Harmonia', version: '0.4.6', frameworkRevision: 'HARMONIA-v0.65+DUG-v388-NX-388m' },
    observation: { enabled: true, active: true, activeTabs: 2, collectorAvailable: true },
    queue: { persistedEventCount: 20, pendingEventCount: 0, pendingBytes: 0 },
    cycles: { totalCount: 0, completedCount: 0, measuredCount: 0, activeCount: 0, unmeasuredCount: 0, medianMs: null, p90Ms: null,
      records: [{ conversationId: 'private-conversation-id', cycleId: 'private-cycle-id', startedAt: '2026-11-11T14:59:00Z' }] },
    coverage: { scanCount: 8, uniqueSurfaceCount: 4, observedFeatureCount: 10, featureCount: 44, observedPercent: 22.7, observedFeatureIds: ['surface.main-chat'] },
    diagnostics: {
      lastError: 'C:\\private\\path\\do-not-send',
      cycleObserver: {
        schema: 'harmonia.cycle-observer-diagnostics.v1',
        queriedTabCount: 2, reportingTabCount: 2,
        totals: {
          observer: {
            reconcileCount: 9, userTurnNodesObserved: 1, activityTrueSnapshots: 3, activityRisingEdges: 0,
            activityFallingEdges: 0, unmatchedActivityEdges: 0, userActivityCorrelationAttempts: 0,
            successfulCorrelations: 0, staleActivityEdges: 0, cycleStartAttempts: 0,
            cycleStartedEvents: 0, cycleStartRejectedNoSignals: 0, cycleCompletedEvents: 0,
            eventSinkAttempts: 0, eventSinkAccepted: 0, eventSinkRejected: 0, eventSinkErrors: 0
          },
          snapshot: {
            snapshotCount: 12, mainFoundCount: 12,
            signalPresence: {
              'aria-busy': { matchingCount: 0, visibleCount: 0 },
              'data-is-streaming': { matchingCount: 0, visibleCount: 0 },
              'stop-control': { matchingCount: 2, visibleCount: 2 },
              'agent-progress': { matchingCount: 0, visibleCount: 0 }
            }
          }
        },
        instances: [
          { tabId: 77, conversationId: 'PRIVATE-ID', snapshot: { lastRootFound: true, lastActivity: true, lastUserMessageCount: 1, lastAssistantMessageCount: 0, lastSignalIds: ['stop-control'] } },
          { tabId: 88, sessionId: 'PRIVATE-SESSION', snapshot: { lastRootFound: true, lastActivity: false, lastUserMessageCount: 0, lastAssistantMessageCount: 0, lastSignalIds: [] } }
        ]
      },
      privateMessage: 'NEVER SEND THIS'
    },
    rawPayload: { conversationText: 'NEVER SEND THIS EITHER', token: 'SECRET_SENTINEL' },
    ...overrides
  };
}

test('compileEvidence emits only allowlisted aggregate structural fields', () => {
  const input = compileEvidence(reportFixture());
  assert.equal(input.schema, 'harmonia.dev-triage-input.v1');
  const serialized = JSON.stringify(input);
  for (const forbidden of [
    'private-conversation-id', 'private-cycle-id', 'PRIVATE-ID', 'PRIVATE-SESSION',
    'C:\\private\\path', 'NEVER SEND THIS', 'SECRET_SENTINEL', 'conversationText',
    'tabId', 'sessionId', 'generatedAt', 'rawPayload'
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
  assert.equal(input.observer.visibleSignalCount, 2);
  assert.equal(input.observer.activityRisingEdges, 0);
  assert.equal(input.observer.rootPresentInstances, 2);
  assert.equal(input.cycles.medianMs, null);
  assert.equal(input.cycles.p90Ms, null);
});

test('fallback selector chooses a deterministic next experiment for missing T1 rising edge', () => {
  const input = compileEvidence(reportFixture());
  const result = fallbackTriage(input, 'no-key');
  assert.equal(result.diagnosis_code, 'no_rising_edge');
  assert.equal(result.scenario_id, 'NO_RISING_EDGE');
  assert.ok(result.evidence_refs.includes('observer.activityRisingEdges'));
});

test('fallback chooses correlation timeout when unmatched processing edges expire', () => {
  const report = reportFixture();
  report.diagnostics.cycleObserver.totals.observer.unmatchedActivityEdges = 2;
  report.diagnostics.cycleObserver.totals.observer.userActivityCorrelationAttempts = 2;
  report.diagnostics.cycleObserver.totals.observer.staleActivityEdges = 2;
  const input = compileEvidence(report);
  const result = fallbackTriage(input);
  assert.equal(result.diagnosis_code, 'correlation_timeout');
  assert.equal(result.scenario_id, 'CORRELATION_ORDER');
});

test('model result validator rejects invented scenario IDs and ungrounded evidence references', () => {
  const input = compileEvidence(reportFixture());
  const base = fallbackTriage(input);
  assert.throws(() => validateModelResult({ ...base, scenario_id: 'RUN_ANY_COMMAND' }, input), /triage_result_fields_invalid|triage_scenario_id_invalid/);
  assert.throws(() => validateModelResult({ ...base, evidence_refs: ['conversation.text'] }, input), /triage_evidence_refs_invalid/);
  assert.equal(RESULT_SCHEMA.additionalProperties, false);
});

test('runAssist uses local fallback when the API key is unavailable', async () => {
  const report = reportFixture();
  let called = false;
  const result = await runAssist({
    report,
    env: {},
    fetchImpl: async () => { called = true; throw new Error('must-not-call'); }
  });
  assert.equal(called, false);
  assert.equal(result.provider, 'local-fallback');
  assert.equal(result.fallbackReason, 'api_key_unavailable');
  assert.equal(JSON.stringify(result).includes('synthetic-secret-never-log'), false);
});

test('runAssist sends only sanitized evidence and validates a mocked strict Groq response', async () => {
  const report = reportFixture();
  let requestBody = null;
  const input = compileEvidence(report);
  const mockResult = {
    ...fallbackTriage(input),
    schema: 'harmonia.dev-triage-result.v1'
  };
  const result = await runAssist({
    report,
    env: { GROQ_API_KEY: 'synthetic-secret' },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(options.headers.authorization, 'Bearer synthetic-secret');
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: JSON.stringify(mockResult) } }],
            usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160 }
          };
        }
      };
    }
  });
  assert.equal(result.provider, 'groq');
  assert.equal(result.model, 'openai/gpt-oss-20b');
  assert.equal(requestBody.response_format.json_schema.strict, true);
  assert.equal(requestBody.stream, false);
  const requestText = JSON.stringify(requestBody);
  assert.equal(requestText.includes('PRIVATE-ID'), false);
  assert.equal(requestText.includes('NEVER SEND THIS'), false);
  assert.equal(JSON.stringify(result).includes('synthetic-secret'), false);
});

test('runAssist skips Groq when the deterministic local diagnosis is conclusive', async () => {
  const report = reportFixture();
  report.diagnostics.cycleObserver.totals.snapshot.mainFoundCount = 0;
  let called = false;
  const result = await runAssist({
    report,
    env: { GROQ_API_KEY: 'synthetic-secret' },
    fetchImpl: async () => { called = true; throw new Error('must-not-call'); }
  });
  assert.equal(called, false);
  assert.equal(result.provider, 'local-fallback');
  assert.equal(result.result.scenario_id, 'ROOT_NOT_FOUND');
  assert.equal(result.routing.route, 'local_deterministic');
  assert.equal(result.routing.invokeGroq, false);
});

test('runAssist refuses external analysis when the validated evidence is insufficient', async () => {
  const report = reportFixture();
  const diagnostics = report.diagnostics.cycleObserver;
  diagnostics.reportingTabCount = 0;
  diagnostics.totals.snapshot.snapshotCount = 0;
  diagnostics.totals.snapshot.mainFoundCount = 0;
  diagnostics.instances = diagnostics.instances.map(item => ({
    ...item, snapshot: { ...item.snapshot, lastRootFound: false, lastActivity: false }
  }));
  let called = false;
  const result = await runAssist({
    report,
    env: { GROQ_API_KEY: 'synthetic-secret' },
    fetchImpl: async () => { called = true; throw new Error('must-not-call'); }
  });
  assert.equal(called, false);
  assert.equal(result.routing.route, 'collect_more_evidence');
  assert.equal(result.routing.invokeGroq, false);
});

test('runAssist invokes Groq only on ambiguous sufficient evidence when its API key is available', async () => {
  const report = reportFixture();
  const input = compileEvidence(report);
  const mockResult = { ...fallbackTriage(input), schema: 'harmonia.dev-triage-result.v1' };
  let called = false;
  const result = await runAssist({
    report,
    env: { GROQ_API_KEY: 'synthetic-secret' },
    fetchImpl: async (_url, options) => {
      called = true;
      const request = JSON.parse(options.body);
      assert.equal(request.messages[1].content.includes('NEVER SEND THIS'), false);
      return { ok: true, async json() {
        return { choices: [{ message: { content: JSON.stringify(mockResult) } }], usage: {} };
      } };
    }
  });
  assert.equal(called, true);
  assert.equal(result.provider, 'groq');
  assert.equal(result.routing.route, 'groq_analysis');
});
