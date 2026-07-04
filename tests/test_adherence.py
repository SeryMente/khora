from datetime import datetime

import pytest

from khora import usage


@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    db = tmp_path / "khora.db"
    monkeypatch.setenv("KHORA_DB", str(db))
    return db


def test_adherence_log_marca_usado_y_no_usado(tmp_store):
    usage.record_capture(datetime.fromisoformat("2026-06-16T09:00:00"))
    usage.record_capture(datetime.fromisoformat("2026-06-18T10:00:00"))
    log = usage.adherence_log("2026-06-16", "2026-06-19")
    assert log == [
        {"day": "2026-06-16", "used": True},
        {"day": "2026-06-17", "used": False},
        {"day": "2026-06-18", "used": True},
        {"day": "2026-06-19", "used": False},
    ]


def test_adherence_log_rechaza_rango_invertido(tmp_store):
    with pytest.raises(ValueError):
        usage.adherence_log("2026-06-19", "2026-06-16")
