from comind.blackbox.sealed import SEALED_FIELDS
from comind.esteg import public_view


def test_no_sealed_leak():
    out = public_view({"text": "hola", "sealed_secret": "X"})
    for field in SEALED_FIELDS:
        assert field not in out


def test_keeps_public_field():
    out = public_view({"text": "hola", "sealed_secret": "X"})
    assert out["text"] == "hola"
