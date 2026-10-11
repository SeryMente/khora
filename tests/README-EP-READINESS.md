# EP preparation evidence validation

Contract: canon v1.2.0 in SeryMente/metodologia commit 48be13a17eb7266315e8bdfe656b40135f151e95, section 28.7 (prepare-only).

This change implements validation/testing only. It does not change runtime entry points, authentication, UI, BitLocker, PowerShell, deployment workflows or production configuration. Runtime EP/host versions are unchanged because their code is unchanged. There is no new launch path.

## Integration

The existing tests/validate_ep.py remains the entry for static checks. Its original checks run first, unchanged. An optional --release-manifest adds preparation validation, with required --evidence-root and --profile. The SHA is obtained from the clean Git checkout rather than trusted from the input. The authorized profile is supplied separately; choosing a smaller profile is not authorization to narrow the task.

The existing CI khora-web-gate runs the regression suite from the same checkout before Node installation. No new deploy workflow is added, and no production deployment is requested. Nothing is merged to main by this change. Do not mark it ready without existing branch checks/reviews and complete candidate validation.

## Manifest and evidence

Manifest schema ep-release/v1 requires: executor Samantha; executor_contract ep-single-invocation/v1; profile; candidate_sha; delivery_mode prepare-only; execution_admitted true; admission_missing and suspensions empty; pending_operations exactly [vercel-publication]; release_id/invocation_id; positive integer revision; admitted_at UTC; and requirements keyed by R01-R32 as applicable. R16-staging and R32-pre are the prepublication evidence slots; live R16/close evidence is not required before deployment.

Each required row must be PASS with evidence.path relative to the private evidence root and evidence.sha256. The referenced JSON receipt ep-test-receipt/v1 contains check_id, candidate_sha, profile, release_id and invocation_id matching the manifest, status PASS, synthetic false, executed_at UTC after admission, exit_code integer zero, producer, environment, action, expected and observed. R15 also requires approval_verified true from an actual required review. R16-staging requires environment staging. Receipts from mocks/fixtures, other SHAs or other invocations cannot certify the system.

The validator rejects missing/non-PASS rows, unsupported profiles, source mismatch, absent admission, additional pending operations, suspension, boolean/string masquerading as integer/success, duplicate JSON keys, invalid JSON constants, unreadable/tampered evidence, traversal/absolute paths/symlinks and stale/future receipts. It computes results rather than accepting an input ready_for_vercel assertion. It never marks published_verified, global_certified or single_cycle_completed true in prepare-only mode.

IMPORTANT: a matching hash is byte integrity, not proof that a receipt's assertions are true. Receipts must come from independently observed tests/reviews and trusted storage. This validator cannot authenticate a forged producer, replace GitHub checks/required human reviews, or run Windows/physical restoration. Its local positive test fixtures are structural tests, not E2E evidence. Production readiness still requires actual observations and all canon gates.

## Local verification of this change

The unittest suite contains 10 methods, including parameterized rejection of every mandatory gate and non-PASS status. They were run locally on Python 3.13. The full repo static checks, TypeScript/build, GitHub checks, Windows PowerShell 5.1 and physical E2E were NOT executed by that suite. The existing static check body was preserved mechanically; preservation is not a fresh PASS of the system.

EP-PREPARATION-STATE.json records observed blockers, not a certified release manifest. Do not treat the JSON or this test commit as a ready candidate.
