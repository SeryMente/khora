const INTENT_KEYS = Object.freeze([
  'schema', 'actor', 'operation', 'workspace', 'scenario_id',
  'shell', 'network', 'writes', 'secret_access'
]);
export const POLICY_SCENARIO_IDS = Object.freeze([
  'ROOT_NOT_FOUND', 'USER_NODE_MISSING', 'SIGNAL_NOT_VISIBLE',
  'ACTIVITY_NOT_OBSERVED', 'SINK_FAILURE', 'WORKER_PERSISTENCE'
]);

function denied(reasonCode) {
  return {
    schema: 'harmonia.policy-decision.v1',
    policy_version: '0.2.0',
    status: 'denied',
    reason_code: reasonCode
  };
}

/**
 * Fail-closed allowlist for one narrowly scoped local structural diagnostic test.
 * It cannot authorize Groq, shell, network, file writes, credentials, browser actions or deployments.
 */
export function authorizeOperation(intent) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(intent))) return denied('intent_invalid');
  const actual = Object.keys(intent).sort();
  const expected = [...INTENT_KEYS].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    return denied('intent_fields_invalid');
  }
  if (intent.schema !== 'harmonia.policy-intent.v1') return denied('intent_schema_invalid');
  if (intent.actor !== 'harmonia') return denied('actor_not_allowed');
  if (intent.operation !== 'run_fixed_diagnostic_test') return denied('operation_not_allowed');
  if (intent.workspace !== 'groqassist_tests') return denied('workspace_not_allowed');
  if (!POLICY_SCENARIO_IDS.includes(intent.scenario_id)) return denied('scenario_not_allowlisted');
  for (const key of ['shell', 'network', 'writes', 'secret_access']) {
    if (intent[key] !== false) return denied('capability_not_allowed');
  }
  return {
    schema: 'harmonia.policy-decision.v1',
    policy_version: '0.2.0',
    status: 'allowed',
    reason_code: 'fixed_structural_test_allowlisted'
  };
}
