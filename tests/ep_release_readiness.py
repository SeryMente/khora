"""Evidence-integrity gate for EP preparation. Not physical/E2E certification.

Only authentic receipts produced by actual tests/reviews may be supplied.
Hashes prove byte integrity, not truth or approval of a forged receipt.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

CONTRACT_VERSION = "ep-single-invocation/v1"
PROFILES = ("EP-V1-MINIMO", "EP-FUNDACIONAL", "EP-INTEGRAL")
SHA = re.compile(r"[0-9a-f]{40}\Z")
HASH = re.compile(r"[0-9a-f]{64}\Z")
MAX_RECEIPT_BYTES = 8 * 1024 * 1024


def required_checks(profile: str) -> tuple[str, ...]:
    if profile not in PROFILES:
        raise ValueError("invalid_profile")
    ids = [f"R{n:02d}" for n in range(1, 18) if n != 16]
    if profile in PROFILES[1:]:
        ids.extend(f"R{n:02d}" for n in range(18, 23))
    if profile == "EP-INTEGRAL":
        ids.extend(f"R{n:02d}" for n in range(23, 32))
    return tuple(ids + ["R16-staging", "R32-pre"])


def decode_json(raw: bytes) -> object:
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate_json_key")
            result[key] = value
        return result

    def reject_constant(_value):
        raise ValueError("invalid_json_constant")

    return json.loads(raw.decode("utf-8"),
                      object_pairs_hook=unique_pairs,
                      parse_constant=reject_constant)


def load_json(path: Path) -> object:
    return decode_json(path.read_bytes())


def valid_timestamp(value: object, now: datetime) -> bool:
    if not isinstance(value, str) or not value.endswith("Z"):
        return False
    try:
        instant = datetime.fromisoformat(value[:-1] + "+00:00")
        return instant.tzinfo is not None and instant <= now
    except ValueError:
        return False


def check_receipt(root: Path, reference: object, sha: str, check_id: str,
                  profile: str, now: datetime, admitted_at: str) -> str | None:
    if not isinstance(reference, dict):
        return "missing_evidence"
    name, digest = reference.get("path"), reference.get("sha256")
    if (not isinstance(name, str) or not name or "\\" in name or ":" in name
            or not isinstance(digest, str) or not HASH.fullmatch(digest)):
        return "invalid_evidence_reference"
    relative = Path(name)
    if relative.is_absolute() or any(p in ("..", ".") for p in name.split("/")):
        return "unsafe_evidence_path"
    try:
        path = root
        for part in relative.parts:
            path = path / part
            if path.is_symlink():
                return "symlink_evidence"
        path = path.resolve(strict=True)
        if not path.is_relative_to(root) or not path.is_file():
            return "unsafe_evidence_path"
        if path.stat().st_size > MAX_RECEIPT_BYTES:
            return "evidence_too_large"
        raw = path.read_bytes()
        if len(raw) > MAX_RECEIPT_BYTES:
            return "evidence_too_large"
        if hashlib.sha256(raw).hexdigest() != digest:
            return "evidence_hash_mismatch"
        receipt = decode_json(raw)
    except (OSError, ValueError, UnicodeError, RecursionError):
        return "unreadable_evidence"
    if not isinstance(receipt, dict):
        return "invalid_receipt"
    expected = {"schema": "ep-test-receipt/v1", "check_id": check_id,
                "candidate_sha": sha, "profile": profile, "status": "PASS"}
    if any(receipt.get(k) != v for k, v in expected.items()):
        return "receipt_identity_or_status_mismatch"
    if receipt.get("synthetic") is not False:
        return "synthetic_or_unclassified_evidence"
    if not valid_timestamp(receipt.get("executed_at"), now):
        return "invalid_evidence_timestamp"
    # No evidence from before admission may certify this invocation.
    if (datetime.fromisoformat(receipt["executed_at"].replace("Z", "+00:00"))
            < datetime.fromisoformat(admitted_at.replace("Z", "+00:00"))):
        return "evidence_predates_admission"
    for field in ("producer", "environment", "action", "expected", "observed"):
        if not isinstance(receipt.get(field), str) or not receipt[field].strip():
            return "incomplete_receipt"
    if type(receipt.get("exit_code")) is not int or receipt["exit_code"] != 0:
        return "receipt_exit_not_success"
    if check_id == "R16-staging" and receipt["environment"] != "staging":
        return "staging_proof_missing"
    if check_id == "R15" and receipt.get("approval_verified") is not True:
        return "required_approval_missing"
    return None


def validate_preparation(manifest: object, evidence_root: Path,
                         expected_sha: str, expected_profile: str,
                         now: datetime | None = None) -> dict:
    """Fail closed; compute readiness rather than trust user-supplied booleans.

    expected_sha/profile come from the verified checkout and authorized scope,
    not from the submitted manifest. Result never claims published/E2E status.
    """
    errors: list[str] = []
    now = now or datetime.now(timezone.utc)
    if (not isinstance(expected_sha, str) or not SHA.fullmatch(expected_sha)
            or expected_profile not in PROFILES or now.tzinfo is None):
        errors.append("invalid_verified_context")
    try:
        if evidence_root.is_symlink():
            raise ValueError("symlink_root")
        root = evidence_root.resolve(strict=True)
        if not root.is_dir():
            raise ValueError("not_a_directory")
    except (OSError, ValueError):
        errors.append("invalid_evidence_root")
        root = None
    if not isinstance(manifest, dict):
        errors.append("invalid_manifest")
        manifest = {}
    for key, value in {"schema": "ep-release/v1", "executor": "Samantha",
                       "executor_contract": CONTRACT_VERSION,
                       "profile": expected_profile, "candidate_sha": expected_sha,
                       "delivery_mode": "prepare-only"}.items():
        if manifest.get(key) != value:
            errors.append("invalid_" + key)
    if manifest.get("execution_admitted") is not True:
        errors.append("execution_not_admitted")
    for key in ("admission_missing", "suspensions"):
        if not isinstance(manifest.get(key), list) or manifest[key] != []:
            errors.append("nonempty_or_missing_" + key)
    if manifest.get("pending_operations") != ["vercel-publication"]:
        errors.append("pending_operations_not_only_vercel")
    for key in ("release_id", "invocation_id"):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            errors.append("missing_" + key)
    admitted = manifest.get("admitted_at")
    if not valid_timestamp(admitted, now):
        errors.append("invalid_admission_timestamp")
    if type(manifest.get("revision")) is not int or manifest["revision"] < 1:
        errors.append("invalid_revision")
    checks = manifest.get("requirements")
    if not isinstance(checks, dict):
        errors.append("missing_requirements")
        checks = {}
    if expected_profile in PROFILES:
        for check_id in required_checks(expected_profile):
            row = checks.get(check_id)
            if not isinstance(row, dict) or row.get("status") != "PASS":
                errors.append(check_id + ":not_pass")
                continue
            if root is not None and valid_timestamp(admitted, now):
                error = check_receipt(root, row.get("evidence"), expected_sha,
                                      check_id, expected_profile, now, admitted)
                if error:
                    errors.append(check_id + ":" + error)
    ready = not errors
    return {"schema": "ep-preparation-result/v1",
            "state": "READY_PARA_VERCEL" if ready else "BLOCKED",
            "ready_for_vercel": ready,
            "single_cycle_preparation_completed": ready,
            "published_verified": False, "global_certified": False,
            "single_cycle_completed": False,
            "errors": errors,
            "limitation": "Receipt integrity is not independent E2E attestation."}
