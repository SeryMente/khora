import json
from pathlib import Path

from comind.esteg.codec import decode, encode

GOLDEN = Path(__file__).parent / "golden"


def _load(name: str) -> list:
    return json.loads((GOLDEN / name).read_text(encoding="utf-8"))


def test_golden_esteg_no_regresa():
    casos = _load("esteg_golden.json")
    assert casos, "golden ESTEG vacio"
    for c in casos:
        assert encode(c["text"], c["bit"]) == c["carrier"]
        assert decode(c["carrier"]) == c["bit"]
        assert c["decoded"] == c["bit"]


def test_golden_graphrag_slot_reservado():
    casos = _load("graphrag_golden.json")
    assert isinstance(casos, list)
    for c in casos:
        assert "input" in c and "expected" in c
