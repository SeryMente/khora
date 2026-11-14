import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeOperation } from './policy-firewall.mjs';

const intent = overrides => ({
  schema: 'harmonia.policy-intent.v1',
  actor: 'harmonia',
  operation: 'run_fixed_diagnostic_test',
  workspace: 'groqassist_tests',
  scenario_id: 'ROOT_NOT_FOUND',
  shell: false,
  network: false,
  writes: false,
  secret_access: false,
  ...overrides
});
test('allows only a known fixed local diagnostic test with no elevated capabilities', () => {
  const result = authorizeOperation(intent());
  assert.equal(result.schema, 'harmonia.policy-decision.v1');
  assert.equal(result.status, 'allowed');
  assert.equal(result.reason_code, 'fixed_structural_test_allowlisted');
});

test('denies unexpected actors, operations, workspaces and scenario identifiers', () => {
  for (const override of [
    { actor: 'groq' }, { operation: 'run_shell' }, { workspace: 'repository_root' },
    { scenario_id: 'NO_RISING_EDGE; delete files' }
  ]) {
    const result = authorizeOperation(intent(override));
    assert.equal(result.status, 'denied');
  }
});

test('denies shell, network, writes and secret access even when the scenario is allowlisted', () => {
  for (const key of ['shell', 'network', 'writes', 'secret_access']) {
    const result = authorizeOperation(intent({ [key]: true }));
    assert.equal(result.status, 'denied', key);
  }
});

test('denies extra fields, missing fields and invalid policy context', () => {
  assert.equal(authorizeOperation(intent({ command: 'whoami' })).status, 'denied');
  const missing = intent();
  delete missing.actor;
  assert.equal(authorizeOperation(missing).status, 'denied');
  assert.equal(authorizeOperation(intent({ scenario_id: 'NOT_ALLOWLISTED' })).status, 'denied');
  assert.equal(authorizeOperation(null).status, 'denied');
});
