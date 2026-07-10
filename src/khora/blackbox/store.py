"""Caja Negra local v0: guarda BioDatum cifrados; no re-expone lo sellado."""
from __future__ import annotations

import json
from pathlib import Path

from cryptography.fernet import Fernet

from khora.blackbox.biodatum import BioDatum


def _key_path(root: Path) -> Path:
    return root / "blackbox.key"


def _store_path(root: Path) -> Path:
    return root / "blackbox.jsonl"


def load_or_create_key(root: Path) -> bytes:
    root.mkdir(parents=True, exist_ok=True)
    path = _key_path(root)
    if path.exists():
        return path.read_bytes()
    key = Fernet.generate_key()
    path.write_bytes(key)
    return key


def seal(datum: BioDatum, root: Path) -> dict[str, object]:
    key = load_or_create_key(root)
    token = Fernet(key).encrypt(datum.sealed_secret.encode("utf-8"))
    record = datum.public_view()
    record["sealed_token"] = token.decode("ascii")
    with _store_path(root).open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")
    return record


def list_public(root: Path) -> list[dict[str, object]]:
    path = _store_path(root)
    if not path.exists():
        return []
    rows: list[dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows
