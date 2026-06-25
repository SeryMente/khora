from pathlib import Path

import pytest

from comind import store
from comind.esteg.ingest import SOURCE, ingest_sentences


def test_ingest_real_sentences(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("COMIND_DB", str(tmp_path / "comind.db"))
    frases = [
        "Hoy avance el ensamble CoMind.",
        "La rebanada e2e ya corre completa.",
        "El codec por paridad recupera el bit.",
    ]
    captures = ingest_sentences(frases)
    assert len(captures) == 3
    stored = store.fetch_all_captures()
    assert len(stored) == 3
    assert {c.text for c in stored} == set(frases)
    assert all(c.source == SOURCE for c in stored)
    assert all(c.hash for c in stored)
