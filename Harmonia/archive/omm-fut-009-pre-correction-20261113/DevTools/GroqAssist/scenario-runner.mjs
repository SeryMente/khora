import { spawnSync } from 'node:child_process';
import { runAssist } from './assist.mjs';
import { authorizeOperation, POLICY_SCENARIO_IDS } from './policy-firewall.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HARMONIA_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const extensionTest = name => resolve(HARMONIA_ROOT, 'Extension', name);

// This is deliberately source-controlled rather than derived from model output or scenarios.json.
const SCENARIOS = Object.freeze({
  ROOT_NOT_FOUND: Object.freeze({
    testFile: extensionTest('surface-catalog.test.js'),
    testNamePattern: 'missing document returns an empty privacy-safe structural report'
  }),
  USER_NODE_MISSING: Object.freeze({
    testFile: extensionTest('cycle-observer.test.js'),
    testNamePattern: 'synthetic: user DOM node does not start; visible processing transition emits T1'
  }),
  SIGNAL_NOT_VISIBLE: Object.freeze({
    testFile: extensionTest('surface-catalog.test.js'),
    testNamePattern: 'visibility and optional structural changes are measured without content access'
  }),
  NO_RISING_EDGE: Object.freeze({
    testFile: extensionTest('cycle-observer.test.js'),
    testNamePattern: 'synthetic: observer diagnostics account for user, T1, T2 and event sink outcomes'
  }),
  CORRELATION_ORDER: Object.freeze({
    testFile: extensionTest('cycle-observer.test.js'),
    testNamePattern: 'synthetic: processing indicator may precede the user DOM node and still preserve the true T1'
  }),
  START_REJECTED: Object.freeze({
    testFile: extensionTest('cycle-observer.test.js'),
    testNamePattern: 'synthetic: diagnostics expose rejection when the processing edge has no allowlisted signal'
  }),
  SINK_FAILURE: Object.freeze({
    testFile: extensionTest('service-worker.outbox.test.js'),
    testNamePattern: 'synthetic: collector rejection exposes only a bounded error code and preserves the pending event'
  }),
  WORKER_PERSISTENCE: Object.freeze({
    testFile: extensionTest('service-worker.outbox.test.js'),
    testNamePattern: 'synthetic: without collector credentials, service worker durably queues metadata-only events and summarizes a graphical cycle'
  }),
  T2_SETTLE: Object.freeze({
    testFile: extensionTest('cycle-observer.test.js'),
    testNamePattern: 'synthetic: assistant and inactive UI state are both required for T2'
  })
});

if (Object.keys(SCENARIOS).sort().join('|') !== [...POLICY_SCENARIO_IDS].sort().join('|')) {
  throw new Error('scenario_policy_catalog_mismatch');
}

const emptyCounts = () => ({ testCount: 0, passed: 0, failed: 0, skipped: 0, todo: 0 });
const result = (scenarioId, status, reason, counts = emptyCounts(), policy = null) => ({
  schema: 'harmonia.scenario-runner-result.v1',
  scenario_id: scenarioId,
  status,
  reason,
  ...counts,
  ...(policy ? { policy } : {})
});

function tapCount(output, label) {
  const match = String(output ?? '').match(new RegExp(`(?:^#\\s*|^ℹ\\s+)${label}\\s+(\\d+)`, 'm'));
  return match ? Number(match[1]) : 0;
}

function parseTapCounts(output) {
  return {
    testCount: tapCount(output, 'tests'),
    passed: tapCount(output, 'pass'),
    failed: tapCount(output, 'fail'),
    skipped: tapCount(output, 'skipped'),
    todo: tapCount(output, 'todo')
  };
}

function isTimeout(processResult) {
  return processResult?.error?.code === 'ETIMEDOUT' || processResult?.signal === 'SIGTERM';
}

/**
 * Runs one fixed, local diagnostic test selected from a closed scenario map.
 * `spawnSyncImpl` is test-only injection; model data is limited to `scenario_id`.
 */
export function runScenario({ result: triageResult, cwd = HARMONIA_ROOT, spawnSyncImpl = spawnSync } = {}) {
  const scenarioId = triageResult?.schema === 'harmonia.dev-triage-result.v1'
    ? triageResult.scenario_id
    : null;
  if (scenarioId === 'INSUFFICIENT_EVIDENCE') {
    return result(scenarioId, 'not_run', 'insufficient_evidence');
  }
  const scenario = typeof scenarioId === 'string' ? SCENARIOS[scenarioId] : undefined;
  if (!scenario) return result(null, 'rejected', 'scenario_id_unknown');

  // The process must remain rooted in Harmonia. A caller-supplied working
  // directory cannot widen the execution boundary.
  if (resolve(cwd) !== HARMONIA_ROOT) {
    const policy = {
      schema: 'harmonia.policy-decision.v1',
      policy_version: '0.1.0',
      status: 'denied',
      reason_code: 'runner_workspace_mismatch'
    };
    return result(scenarioId, 'rejected', 'policy_denied', emptyCounts(), policy);
  }

  const policy = authorizeOperation({
    schema: 'harmonia.policy-intent.v1',
    actor: 'harmonia',
    operation: 'run_fixed_diagnostic_test',
    workspace: 'groqassist_tests',
    scenario_id: scenarioId,
    shell: false,
    network: false,
    writes: false,
    secret_access: false
  });
  if (policy.status !== 'allowed') {
    return result(scenarioId, 'rejected', 'policy_denied', emptyCounts(), policy);
  }

  let processResult;
  try {
    // Pass only the OS variables required to start a local Node process on Windows.
    // Never inherit API keys, Vault state, user secrets or Node's internal test IPC flags.
    const childEnv = {};
    for (const key of [
      'PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE',
      'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA'
    ]) {
      if (typeof process.env[key] === 'string') childEnv[key] = process.env[key];
    }
    processResult = spawnSyncImpl(process.execPath, [
      '--test', '--test-name-pattern', scenario.testNamePattern, scenario.testFile
    ], {
      cwd: HARMONIA_ROOT,
      encoding: 'utf8',
      env: childEnv,
      shell: false,
      timeout: 60_000,
      windowsHide: true
    });
  } catch {
    return result(scenarioId, 'failed', 'test_process_failed', emptyCounts(), policy);
  }

  const counts = parseTapCounts(processResult?.stdout);
  if (isTimeout(processResult)) return result(scenarioId, 'failed', 'test_timeout', counts, policy);
  if (counts.testCount === 0) return result(scenarioId, 'failed', 'zero_tests_matched', counts, policy);
  if (processResult?.error || processResult?.status !== 0 || counts.failed > 0) {
    return result(scenarioId, 'failed', 'test_process_failed', counts, policy);
  }
  return result(scenarioId, 'passed', 'tests_passed', counts, policy);
}

/**
 * End-to-end local engineering cycle:
 * sanitized triage (local first, Groq only when its own gates permit it),
 * then one fixed local experiment selected by the validated scenario ID.
 */
export async function runEngineeringCycle({
  report,
  env = process.env,
  fetchImpl = fetch,
  cwd = HARMONIA_ROOT,
  spawnSyncImpl = spawnSync
} = {}) {
  const triageRun = await runAssist({ report, env, fetchImpl });
  const triage = triageRun.result;
  const experiment = runScenario({ result: triage, cwd, spawnSyncImpl });
  return {
    schema: 'harmonia.engineering-cycle.v1',
    triage: {
      provider: triageRun.provider,
      model: triageRun.model,
      fallbackReason: triageRun.fallbackReason,
      durationMs: triageRun.durationMs,
      tokenUsage: triageRun.tokenUsage,
      routing: triageRun.routing ? { ...triageRun.routing } : null,
      diagnosis_code: triage.diagnosis_code,
      confidence: triage.confidence,
      evidence_refs: [...triage.evidence_refs],
      scenario_id: triage.scenario_id,
      expected_observation: triage.expected_observation,
      falsification_condition: triage.falsification_condition,
      reason_summary: triage.reason_summary
    },
    experiment
  };
}

export const SCENARIO_IDS = Object.freeze(Object.keys(SCENARIOS));
