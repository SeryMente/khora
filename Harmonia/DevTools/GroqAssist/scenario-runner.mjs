import { spawnSync } from 'node:child_process';
import { runAssist } from './assist.mjs';
import { authorizeOperation, POLICY_SCENARIO_IDS } from './policy-firewall.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HARMONIA_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const extensionTest = name => resolve(HARMONIA_ROOT, 'Extension', name);
const collectorTest = name => resolve(HARMONIA_ROOT, 'Collector', name);

// Fixed test patterns only. No model output can supply a command, path or selector.
const SCENARIOS = Object.freeze({
  ROOT_NOT_FOUND: Object.freeze({
    testFile: extensionTest('activity-observer.test.js'),
    testNamePattern: 'missing main region is exposed as structural absence, not a timing failure'
  }),
  USER_NODE_MISSING: Object.freeze({
    testFile: extensionTest('activity-observer.test.js'),
    testNamePattern: 'empty role counts are accepted without collecting conversation text'
  }),
  SIGNAL_NOT_VISIBLE: Object.freeze({
    testFile: extensionTest('surface-catalog.test.js'),
    testNamePattern: 'visibility and optional structural changes are measured without content access'
  }),
  ACTIVITY_NOT_OBSERVED: Object.freeze({
    testFile: extensionTest('activity-observer.test.js'),
    testNamePattern: 'initialization records only structural active state, without timing fields'
  }),
  SINK_FAILURE: Object.freeze({
    testFile: extensionTest('activity-observer.test.js'),
    testNamePattern: 'rejected event sink is counted without creating a duration metric'
  }),
  WORKER_PERSISTENCE: Object.freeze({
    testFile: collectorTest('activity-telemetry.test.js'),
    testNamePattern: 'activity event summary reports transitions and last captured timestamp without deriving durations'
  })
});
if (Object.keys(SCENARIOS).sort().join('|') !== [...POLICY_SCENARIO_IDS].sort().join('|')) {
  throw new Error('scenario_policy_catalog_mismatch');
}
const emptyCounts = () => ({ testCount: 0, passed: 0, failed: 0, skipped: 0, todo: 0 });
const result = (scenarioId, status, reason, counts = emptyCounts(), policy = null) => ({
  schema: 'harmonia.scenario-runner-result.v2',
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

/** Runs one fixed local structural test selected from a closed scenario map. */
export function runScenario({ result: triageResult, cwd = HARMONIA_ROOT, spawnSyncImpl = spawnSync } = {}) {
  const scenarioId = triageResult?.schema === 'harmonia.dev-triage-result.v1'
    ? triageResult.scenario_id : null;
  if (scenarioId === 'INSUFFICIENT_EVIDENCE') return result(scenarioId, 'not_run', 'insufficient_evidence');
  const scenario = typeof scenarioId === 'string' ? SCENARIOS[scenarioId] : undefined;
  if (!scenario) return result(null, 'rejected', 'scenario_id_unknown');

  if (resolve(cwd) !== HARMONIA_ROOT) {
    const policy = { schema:'harmonia.policy-decision.v1', policy_version:'0.2.0', status:'denied', reason_code:'runner_workspace_mismatch' };
    return result(scenarioId, 'rejected', 'policy_denied', emptyCounts(), policy);
  }
  const policy = authorizeOperation({
    schema:'harmonia.policy-intent.v1', actor:'harmonia', operation:'run_fixed_diagnostic_test',
    workspace:'groqassist_tests', scenario_id:scenarioId,
    shell:false, network:false, writes:false, secret_access:false
  });
  if (policy.status !== 'allowed') return result(scenarioId, 'rejected', 'policy_denied', emptyCounts(), policy);

  let processResult;
  try {
    const childEnv = {};
    for (const key of ['PATH','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','PROGRAMDATA']) {
      if (typeof process.env[key] === 'string') childEnv[key] = process.env[key];
    }
    processResult = spawnSyncImpl(process.execPath, [
      '--test','--test-name-pattern',scenario.testNamePattern,scenario.testFile
    ], { cwd:HARMONIA_ROOT, encoding:'utf8', env:childEnv, shell:false, timeout:60_000, windowsHide:true });
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

export async function runEngineeringCycle({ report, env = process.env, fetchImpl = fetch, cwd = HARMONIA_ROOT, spawnSyncImpl = spawnSync } = {}) {
  const triageRun = await runAssist({ report, env, fetchImpl });
  const triage = triageRun.result;
  const experiment = runScenario({ result: triage, cwd, spawnSyncImpl });
  return {
    schema: 'harmonia.engineering-cycle.v2',
    triage: {
      provider: triageRun.provider,
      model: triageRun.model,
      fallbackReason: triageRun.fallbackReason,
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
