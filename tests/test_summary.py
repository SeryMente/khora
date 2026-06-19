from datetime import datetime

import pytest

from comind import usage


@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    db = tmp_path / "comind.db"
    monkeypatch.setenv("COMIND_DB", str(db))
    return db


def test_adherence_summary_4_semanas(tmp_store):
    usage.record_capture(datetime.fromisoformat("2026-06-16T09:00:00"))
    usage.record_capture(datetime.fromisoformat("2026-06-18T09:00:00"))
    s = usage.adherence_summary(weeks=4, today="2026-06-19")
    assert s["days_total"] == 28
    assert s["days_used"] == 2
    assert s["pct"] == round(2 / 28 * 100, 1)
    assert len(s["per_week"]) == 4
    assert s["window"]["start"] == "2026-05-23"
    assert s["window"]["end"] == "2026-06-19"


def test_adherence_summary_rechaza_semanas_invalidas(tmp_store):
    with pytest.raises(ValueError):
        usage.adherence_summary(weeks=0)
