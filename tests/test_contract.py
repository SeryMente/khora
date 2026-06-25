from datetime import datetime

import pytest
from pydantic import ValidationError

from comind.esteg.record import EstegRecord


def test_valid_record():
    r = EstegRecord(
        id="r1",
        text="hola",
        bit=1,
        created_at=datetime(2026, 6, 25, 12, 0, 0),
    )
    assert r.bit == 1
    assert r.text == "hola"


def test_rejects_empty_text():
    with pytest.raises(ValidationError):
        EstegRecord(id="r1", text="", bit=0, created_at=datetime(2026, 6, 25))


def test_rejects_bad_bit():
    with pytest.raises(ValidationError):
        EstegRecord(id="r1", text="x", bit=2, created_at=datetime(2026, 6, 25))
