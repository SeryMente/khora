import pytest

from comind.esteg.codec import decode, encode


def test_bit_changes_carrier():
    assert encode("hola", 1) != encode("hola", 0)


def test_round_trip_recovers_bit():
    for text in ("hola", "mundo", "abc123", ""):
        for bit in (0, 1):
            assert decode(encode(text, bit)) == bit


def test_deterministic():
    assert encode("hola", 1) == encode("hola", 1)


def test_rejects_bad_bit():
    with pytest.raises(ValueError):
        encode("x", 2)
