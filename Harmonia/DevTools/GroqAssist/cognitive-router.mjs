const TASK_TYPES = Object.freeze([
  'diagnostic_triage', 'implementation', 'architecture_decision', 'security_sensitive', 'unknown'
]);
const RISKS = Object.freeze(['low', 'medium', 'high', 'critical']);

function invalid() {
  throw new TypeError('cognitive_request_invalid');
}
function decision(taskType, route, reasonCode, options = {}) {
  return {
    schema: 'harmonia.cognitive-route.v1',
    taskType,
    route,
    reasonCode,
    invokeGroq: options.invokeGroq === true,
    dispatch: false,
    requiresOperator: options.requiresOperator === true
  };
}

/**
 * Pure routing policy: it chooses a responsible subsystem but never invokes
 * APIs, starts processes, grants permissions or executes a task.
 */
export function routeCognitiveTask(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(request))) invalid();
  const allowedKeys = [
    'taskType', 'evidenceSufficient', 'localActionable', 'localConfidence',
    'groqAvailable', 'risk', 'contractValidated', 'operatorAuthorized'
  ];
  const actualKeys = Object.keys(request).sort();
  const expectedKeys = [...allowedKeys].sort();
  if (actualKeys.some(key => !expectedKeys.includes(key)) ||
      ['taskType', 'evidenceSufficient', 'localActionable', 'localConfidence',
       'groqAvailable', 'risk'].some(key => !actualKeys.includes(key))) invalid();
  const {
    taskType, evidenceSufficient, localActionable, localConfidence,
    groqAvailable, risk, contractValidated, operatorAuthorized
  } = request;
  if (!TASK_TYPES.includes(taskType) ||
      typeof evidenceSufficient !== 'boolean' ||
      typeof localActionable !== 'boolean' ||
      typeof localConfidence !== 'number' || !Number.isFinite(localConfidence) ||
      localConfidence < 0 || localConfidence > 1 ||
      typeof groqAvailable !== 'boolean' ||
      !RISKS.includes(risk) ||
      (contractValidated !== undefined && typeof contractValidated !== 'boolean') ||
      (operatorAuthorized !== undefined && typeof operatorAuthorized !== 'boolean')) {
    invalid();
  }

  if (risk === 'high' || risk === 'critical') {
    return decision(taskType, 'operator_review', 'risk_requires_operator_review', { requiresOperator: true });
  }
  if (taskType === 'architecture_decision') {
    return decision(taskType, 'chatgpt_architecture', 'architecture_authority_chatgpt');
  }
  if (taskType === 'security_sensitive') {
    return decision(taskType, 'policy_firewall', 'deterministic_policy_required', { requiresOperator: true });
  }
  if (taskType === 'implementation') {
    if (contractValidated !== true || operatorAuthorized !== true) {
      return decision(taskType, 'codex_contract_review', 'implementation_contract_or_authorization_missing', { requiresOperator: true });
    }
    return decision(taskType, 'codex_candidate', 'contract_validated_operator_authorized');
  }
  if (taskType === 'unknown') {
    return decision(taskType, 'chatgpt_escalation', 'unknown_task_type', { requiresOperator: true });
  }

  if (!evidenceSufficient) {
    return decision(taskType, 'collect_more_evidence', 'evidence_insufficient');
  }
  if (localActionable && localConfidence >= 0.9) {
    return decision(taskType, 'local_deterministic', 'local_diagnosis_conclusive');
  }
  if (groqAvailable) {
    return decision(taskType, 'groq_analysis', 'ambiguous_evidence_and_api_key_available', { invokeGroq: true });
  }
  return decision(taskType, 'local_fallback', 'groq_unavailable');
}
