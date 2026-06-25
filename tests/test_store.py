from datetime import datetime
from pathlib import Path

from comind.esteg.record import EstegRecord
from comind.esteg.store import append, read_all


def test_round_trip(tmp_path: Path):
    rec = EstegRecord(
        id="r1", text="hola", bit=1,
        created_at=datetime(2026, 6, 25),
    )
    append(rec, tmp_path / "e.jsonl")
    out = read_all(tmp_path / "e.jsonl")
    assert len(out) == 1 and out[0].id == "r1"


def test_empty_when_missing(tmp_path: Path):
    assert read_all(tmp_path / "x.jsonl") == []
