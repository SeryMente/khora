import test from 'node:test';
import assert from 'node:assert/strict';
import { routeCognitiveTask } from './cognitive-router.mjs';

const request = overrides => ({
  taskType: 'diagnostic_triage',
  evidenceSufficient: true,
  localActionable: false,
  localConfidence: 0.5,
  groqAvailable: true,
  risk: 'low',
  contractValidated: false,
  operatorAuthorized: false,
  ...overrides
});

test('requests more local evidence and never invokes Groq when evidence is insufficient', () => {
  const result = routeCognitiveTask(request({ evidenceSufficient: false }));
  assert.equal(result.route, 'collect_more_evidence');
  assert.equal(result.invokeGroq, false);
  assert.equal(result.dispatch, false);
});

test('keeps high-confidence actionable diagnoses on the deterministic local path', () => {
  const result = routeCognitiveTask(request({ localActionable: true, localConfidence: 0.95 }));
  assert.equal(result.route, 'local_deterministic');
  assert.equal(result.invokeGroq, false);
});

test('uses Groq for sufficient ambiguous low-risk evidence when its API key is available', () => {
  const result = routeCognitiveTask(request());
  assert.equal(result.route, 'groq_analysis');
  assert.equal(result.invokeGroq, true);
  assert.equal(result.dispatch, false);
});

test('uses local fallback when Groq is unavailable', () => {
  const result = routeCognitiveTask(request({ groqAvailable: false }));
  assert.equal(result.invokeGroq, false);
  assert.equal(result.route, 'local_fallback');
  assert.equal(result.reasonCode, 'groq_unavailable');
});

test('high and critical risk always escalate before any subsystem route', () => {
  for (const taskType of ['diagnostic_triage', 'implementation', 'architecture_decision', 'security_sensitive', 'unknown']) {
    for (const risk of ['high', 'critical']) {
      const result = routeCognitiveTask(request({ taskType, risk }));
      assert.equal(result.route, 'operator_review');
      assert.equal(result.invokeGroq, false);
      assert.equal(result.dispatch, false);
      assert.equal(result.requiresOperator, true);
    }
  }
});

test('architecture and security work are routed by responsibility and never dispatched', () => {
  assert.equal(routeCognitiveTask(request({ taskType: 'architecture_decision' })).route, 'chatgpt_architecture');
  assert.equal(routeCognitiveTask(request({ taskType: 'security_sensitive' })).route, 'policy_firewall');
  assert.equal(routeCognitiveTask(request({ taskType: 'unknown' })).route, 'chatgpt_escalation');
});

test('implementation requires a validated contract and operator authorization', () => {
  const denied = routeCognitiveTask(request({ taskType: 'implementation' }));
  assert.equal(denied.route, 'codex_contract_review');
  assert.equal(denied.dispatch, false);
  const candidate = routeCognitiveTask(request({
    taskType: 'implementation', contractValidated: true, operatorAuthorized: true
  }));
  assert.equal(candidate.route, 'codex_candidate');
  assert.equal(candidate.dispatch, false);
  assert.equal(candidate.invokeGroq, false);
});

test('rejects malformed or extended router inputs instead of guessing', () => {
  assert.throws(() => routeCognitiveTask(request({ localConfidence: 2 })), /cognitive_request_invalid/);
  assert.throws(() => routeCognitiveTask(request({ risk: 'unknown' })), /cognitive_request_invalid/);
  assert.throws(() => routeCognitiveTask(request({ command: 'invoke_shell' })), /cognitive_request_invalid/);
});
