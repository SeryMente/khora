from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from ep_release_readiness import load_json, required_checks, validate_preparation


class PreparationGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.sha = "a" * 40
        self.now = datetime(2026, 10, 11, 3, tzinfo=timezone.utc)
        self.profile = "EP-INTEGRAL"
        self.manifest = {
            "schema": "ep-release/v1", "executor": "Samantha",
            "executor_contract": "ep-single-invocation/v1",
            "candidate_sha": self.sha, "profile": self.profile,
            "delivery_mode": "prepare-only", "execution_admitted": True,
            "admission_missing": [], "suspensions": [],
            "pending_operations": ["vercel-publication"],
            "release_id": "test-release", "invocation_id": "test-invocation",
            "revision": 1, "admitted_at": "2026-10-11T01:00:00Z",
            "requirements": {},
        }
        # These are generated test fixtures, NEVER operational evidence.
        # synthetic=False models a real producer receipt for structural tests only.
        for check_id in required_checks(self.profile):
            receipt = {
                "schema": "ep-test-receipt/v1", "check_id": check_id,
                "candidate_sha": self.sha, "profile": self.profile,
                "status": "PASS", "synthetic": False,
                "executed_at": "2026-10-11T02:00:00Z", "exit_code": 0,
                "producer": "test-fixture", "environment": "staging",
                "action": "fixture-action", "expected": "fixture expected",
                "observed": "fixture observed", "approval_verified": True,
            }
            path = self.root / (check_id + ".json")
            path.write_text(json.dumps(receipt))
            self.manifest["requirements"][check_id] = {
                "status": "PASS", "evidence": self.reference(path),
            }

    def tearDown(self):
        self.tmp.cleanup()

    def reference(self, path):
        return {"path": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

    def check(self, manifest=None, profile=None, root=None):
        return validate_preparation(self.manifest if manifest is None else manifest,
                                    self.root if root is None else root, self.sha,
                                    profile or self.profile, self.now)

    def change_receipt(self, check_id, **fields):
        path = self.root / (check_id + ".json")
        receipt = load_json(path)
        receipt.update(fields)
        path.write_text(json.dumps(receipt))
        self.manifest["requirements"][check_id]["evidence"] = self.reference(path)

    def assert_blocked(self, result):
        self.assertFalse(result["ready_for_vercel"])
        self.assertEqual(result["state"], "BLOCKED")
        self.assertFalse(result["published_verified"])
        self.assertFalse(result["global_certified"])
        self.assertFalse(result["single_cycle_completed"])

    def test_structurally_complete_fixture_is_prepared_not_published(self):
        result = self.check()
        self.assertTrue(result["ready_for_vercel"])
        self.assertFalse(result["published_verified"])
        self.assertFalse(result["global_certified"])
        self.assertFalse(result["single_cycle_completed"])

    def test_all_profiles_enforce_authorized_scope(self):
        self.assertEqual(len(required_checks("EP-V1-MINIMO")), 18)
        self.assertEqual(len(required_checks("EP-FUNDACIONAL")), 23)
        self.assertEqual(len(required_checks("EP-INTEGRAL")), 32)
        self.assert_blocked(self.check(profile="EP-V1-MINIMO"))
        with self.assertRaises(ValueError):
            required_checks("UNKNOWN")

    def test_each_missing_gate_blocks(self):
        for check_id in required_checks(self.profile):
            with self.subTest(check_id=check_id):
                manifest = copy.deepcopy(self.manifest)
                del manifest["requirements"][check_id]
                self.assert_blocked(self.check(manifest))

    def test_each_nonpass_gate_blocks(self):
        for status in ("FAIL", "BLOCKED", "NOT_VERIFIED", "SKIPPED", True, None):
            for check_id in required_checks(self.profile):
                with self.subTest(status=status, check_id=check_id):
                    manifest = copy.deepcopy(self.manifest)
                    manifest["requirements"][check_id]["status"] = status
                    self.assert_blocked(self.check(manifest))

    def test_manifest_changes_do_not_retain_readiness(self):
        for key, value in (
            ("candidate_sha", "b" * 40), ("execution_admitted", False),
            ("execution_admitted", "true"), ("suspensions", [{}]),
            ("admission_missing", ["windows_offline"]),
            ("pending_operations", ["vercel-publication", "migration"]),
            ("delivery_mode", "publish"), ("revision", True),
            ("admitted_at", "2026-10-12T00:00:00Z"),
        ):
            with self.subTest(key=key, value=value):
                manifest = copy.deepcopy(self.manifest)
                manifest[key] = value
                manifest["ready_for_vercel"] = True  # Assertion is deliberately ignored.
                self.assert_blocked(self.check(manifest))

    def test_missing_file_hash_mismatch_and_tamper_block(self):
        row = self.manifest["requirements"]["R01"]
        row["evidence"]["sha256"] = "0" * 64
        self.assert_blocked(self.check())
        (self.root / "R01.json").unlink()
        self.assert_blocked(self.check())

    def test_path_escape_absolute_and_symlink_block(self):
        row = self.manifest["requirements"]["R01"]
        for name in ("../secret.json", "/etc/passwd", "C:\\secret", "./R01.json"):
            row["evidence"]["path"] = name
            self.assert_blocked(self.check())
        link = self.root / "link.json"
        link.symlink_to(self.root / "R01.json")
        row["evidence"]["path"] = "link.json"
        self.assert_blocked(self.check())

    def test_receipt_approvals_identity_and_timestamps(self):
        cases = (
            ("R15", {"approval_verified": False}),
            ("R01", {"synthetic": True}),
            ("R01", {"candidate_sha": "b" * 40}),
            ("R01", {"executed_at": "2026-10-12T00:00:00Z"}),
            ("R01", {"executed_at": "2026-10-10T00:00:00Z"}),
            ("R01", {"exit_code": 1}), ("R01", {"exit_code": False}),
            ("R16-staging", {"environment": "production"}),
        )
        for check_id, fields in cases:
            with self.subTest(check_id=check_id, fields=fields):
                path = self.root / (check_id + ".json")
                old = path.read_bytes()
                self.change_receipt(check_id, **fields)
                self.assert_blocked(self.check())
                path.write_bytes(old)
                self.manifest["requirements"][check_id]["evidence"] = self.reference(path)

    def test_invalid_json_duplicate_keys_and_constants_rejected(self):
        path = self.root / "bad.json"
        for text in ('{"status":"FAIL","status":"PASS"}', '{"value":NaN}'):
            path.write_text(text)
            with self.assertRaises(ValueError):
                load_json(path)

    def test_empty_and_nonobject_manifest_fail_closed(self):
        for manifest in ({}, [], None, "PASS"):
            # Pass directly because the local check(None) helper selects self.manifest.
            result = validate_preparation(manifest, self.root, self.sha, self.profile, self.now)
            self.assert_blocked(result)


if __name__ == "__main__":
    unittest.main()
