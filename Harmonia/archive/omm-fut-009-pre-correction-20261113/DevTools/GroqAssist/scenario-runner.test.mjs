import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenario, runEngineeringCycle, SCENARIO_IDS } from './scenario-runner.mjs';

const resultFor = scenario_id => ({
  schema: 'harmonia.dev-triage-result.v1',
  scenario_id
});

const tap = ({ tests = 1, pass = tests, fail = 0, skipped = 0, todo = 0 } = {}) => [
  'TAP version 13',
  `1..${tests}`,
  `# tests ${tests}`,
  `# pass ${pass}`,
  `# fail ${fail}`,
  `# skipped ${skipped}`,
  `# todo ${todo}`
].join('\n');

test('hostile or unknown scenario IDs fail closed before process launch', () => {
  let launched = false;
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE; Remove-Item -Recurse C:\\'),
    spawnSyncImpl: () => { launched = true; }
  });
  assert.equal(launched, false);
  assert.deepEqual(output, {
    schema: 'harmonia.scenario-runner-result.v1', scenario_id: null,
    status: 'rejected', reason: 'scenario_id_unknown', testCount: 0,
    passed: 0, failed: 0, skipped: 0, todo: 0
  });
});

test('insufficient evidence is a no-op that runs zero tests', () => {
  let launched = false;
  const output = runScenario({
    result: resultFor('INSUFFICIENT_EVIDENCE'),
    spawnSyncImpl: () => { launched = true; }
  });
  assert.equal(launched, false);
  assert.equal(output.status, 'not_run');
  assert.equal(output.reason, 'insufficient_evidence');
  assert.equal(output.testCount, 0);
});

test('allowlisted scenario runs only its fixed Node test with fixed argv', () => {
  let invocation;
  const output = runScenario({
    result: resultFor('USER_NODE_MISSING'),
    spawnSyncImpl: (...args) => {
      invocation = args;
      return { status: 0, stdout: tap(), stderr: 'private diagnostic output' };
    }
  });
  assert.equal(invocation[0], process.execPath);
  assert.deepEqual(invocation[1].slice(0, 3), ['--test', '--test-name-pattern', 'synthetic: user DOM node does not start; visible processing transition emits T1']);
  assert.equal(invocation[2].shell, false);
  assert.equal(invocation[2].timeout, 60_000);
  assert.equal(output.status, 'passed');
  assert.equal(output.testCount, 1);
  assert.equal(output.passed, 1);
  assert.equal(JSON.stringify(output).includes('private diagnostic output'), false);
});

test('zero matched tests is a failure', () => {
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE'),
    spawnSyncImpl: () => ({ status: 0, stdout: tap({ tests: 0 }), stderr: '' })
  });
  assert.equal(output.status, 'failed');
  assert.equal(output.reason, 'zero_tests_matched');
  assert.equal(output.testCount, 0);
});

test('process failures cannot be reported as success and raw output is omitted', () => {
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE'),
    spawnSyncImpl: () => ({
      status: 1,
      stdout: `${tap()}\nsecret stdout`,
      stderr: 'secret stderr'
    })
  });
  assert.equal(output.status, 'failed');
  assert.equal(output.reason, 'test_process_failed');
  assert.equal(JSON.stringify(output).includes('secret'), false);
  assert.equal('stdout' in output, false);
  assert.equal('stderr' in output, false);
});

test('every fixed scenario pattern matches its named existing test', () => {
  for (const scenarioId of SCENARIO_IDS) {
    const output = runScenario({ result: resultFor(scenarioId) });
    assert.equal(output.status, 'passed', `${scenarioId}:${output.reason}`);
    assert.ok(output.testCount > 0, scenarioId);
  }
});

test('ROOT_NOT_FOUND selects the fixed missing-document structural test', () => {
  let invocation;
  runScenario({
    result: resultFor('ROOT_NOT_FOUND'),
    spawnSyncImpl: (...args) => {
      invocation = args;
      return { status: 0, stdout: tap(), stderr: '' };
    }
  });
  assert.match(invocation[1].at(-1), /Extension[\\/]surface-catalog\.test\.js$/);
  assert.equal(invocation[1][2], 'missing document returns an empty privacy-safe structural report');
});

test('SIGNAL_NOT_VISIBLE selects the fixed visibility measurement test', () => {
  let invocation;
  runScenario({
    result: resultFor('SIGNAL_NOT_VISIBLE'),
    spawnSyncImpl: (...args) => {
      invocation = args;
      return { status: 0, stdout: tap(), stderr: '' };
    }
  });
  assert.match(invocation[1].at(-1), /Extension[\\/]surface-catalog\.test\.js$/);
  assert.equal(invocation[1][2], 'visibility and optional structural changes are measured without content access');
});

test('diagnostic child inherits only minimal OS environment and no credentials', () => {
  const keys = ['GROQ_API_KEY', 'EP_VAULT_CLI', 'HARMONIA_TEST_SECRET', 'NODE_TEST_CONTEXT'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = 'must-not-cross-process-boundary';
    let childEnv;
    runScenario({
      result: resultFor('NO_RISING_EDGE'),
      spawnSyncImpl: (_exe, _args, options) => {
        childEnv = options.env;
        return { status: 0, stdout: tap(), stderr: '' };
      }
    });
    for (const key of keys) assert.equal(key in childEnv, false, key);
    assert.ok(childEnv.PATH || childEnv.Path, 'PATH is retained for Windows child process startup');
    assert.ok(childEnv.SystemRoot || childEnv.SYSTEMROOT, 'SystemRoot is retained for Windows runtime');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('timed out scenario is always reported as failed', () => {
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE'),
    spawnSyncImpl: () => ({
      status: null,
      signal: 'SIGTERM',
      error: { code: 'ETIMEDOUT' },
      stdout: tap(),
      stderr: 'timeout details'
    })
  });
  assert.equal(output.status, 'failed');
  assert.equal(output.reason, 'test_timeout');
  assert.equal(JSON.stringify(output).includes('timeout details'), false);
});

test('runEngineeringCycle performs sanitized local triage then the allowlisted experiment', async () => {
  const report = JSON.parse(readFileSync(new URL('./example-diagnostic-report.json', import.meta.url), 'utf8'));
  let fetchCalled = false;
  let invocation;
  const output = await runEngineeringCycle({
    report,
    env: {},
    fetchImpl: async () => { fetchCalled = true; throw new Error('network must not be called'); },
    spawnSyncImpl: (...args) => {
      invocation = args;
      return { status: 0, stdout: tap(), stderr: 'must-not-return' };
    }
  });
  assert.equal(fetchCalled, false);
  assert.equal(output.schema, 'harmonia.engineering-cycle.v1');
  assert.equal(output.triage.provider, 'local-fallback');
  assert.equal(output.triage.fallbackReason, 'api_key_unavailable');
  assert.equal(output.triage.scenario_id, 'NO_RISING_EDGE');
  assert.equal(output.experiment.status, 'passed');
  assert.equal(invocation[2].shell, false);
  assert.equal(JSON.stringify(output).includes('must-not-return'), false);
  assert.equal(JSON.stringify(output).includes('NO_PROMPT_SHOULD_BE_HERE'), false);
});

test('runEngineeringCycle stops without dispatch when triage has insufficient evidence', async () => {
  const report = JSON.parse(readFileSync(new URL('./example-diagnostic-report.json', import.meta.url), 'utf8'));
  report.diagnostics.cycleObserver.reportingTabCount = 0;
  report.diagnostics.cycleObserver.totals.snapshot.snapshotCount = 0;
  report.diagnostics.cycleObserver.totals.snapshot.mainFoundCount = 0;
  report.diagnostics.cycleObserver.instances = report.diagnostics.cycleObserver.instances.map(item => ({
    ...item, snapshot: { ...item.snapshot, lastRootFound: false, lastActivity: false }
  }));
  let launched = false;
  const output = await runEngineeringCycle({
    report,
    env: {},
    fetchImpl: async () => { throw new Error('network must not be called'); },
    spawnSyncImpl: () => { launched = true; }
  });
  assert.equal(launched, false);
  assert.equal(output.triage.scenario_id, 'INSUFFICIENT_EVIDENCE');
  assert.equal(output.experiment.status, 'not_run');
  assert.equal(output.experiment.testCount, 0);
});

test('NO_RISING_EDGE selects the T1 activity-edge diagnostic test', () => {
  let invocation;
  runScenario({
    result: resultFor('NO_RISING_EDGE'),
    spawnSyncImpl: (...args) => {
      invocation = args;
      return { status: 0, stdout: tap(), stderr: '' };
    }
  });
  assert.equal(invocation[1][2], 'synthetic: observer diagnostics account for user, T1, T2 and event sink outcomes');
});

test('runScenario returns an explicit local firewall authorization decision', () => {
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE'),
    spawnSyncImpl: () => ({ status: 0, stdout: tap(), stderr: '' })
  });
  assert.deepEqual(output.policy, {
    schema: 'harmonia.policy-decision.v1',
    policy_version: '0.1.0',
    status: 'allowed',
    reason_code: 'fixed_diagnostic_test_allowlisted'
  });
});

test('refuses to launch a fixed scenario outside the Harmonia workspace root', () => {
  let launched = false;
  const output = runScenario({
    result: resultFor('NO_RISING_EDGE'),
    cwd: 'C:\\\\Temp',
    spawnSyncImpl: () => { launched = true; return { status: 0, stdout: tap(), stderr: '' }; }
  });
  assert.equal(launched, false);
  assert.equal(output.status, 'rejected');
  assert.equal(output.reason, 'policy_denied');
  assert.equal(output.policy.status, 'denied');
  assert.equal(output.policy.reason_code, 'runner_workspace_mismatch');
});
