"""Prueba real BioDatum v0: separa sellado de visible."""
from comind.blackbox.biodatum import BioDatum
from comind.blackbox.sealed import SEALED_FIELDS


def _make() -> BioDatum:
    return BioDatum(datum_id="d1", sealed_secret="recuerdo intimo")


def test_public_view_oculta_lo_sellado() -> None:
    view = _make().public_view()
    for name in SEALED_FIELDS:
        assert name not in view
    assert "recuerdo intimo" not in view.values()


def test_metadatos_visibles_presentes() -> None:
    view = _make().public_view()
    assert view["datum_id"] == "d1"
    assert view["source"] == "cli"
    assert view["modality"] == "text"
    assert view["seal_hash"]


def test_hash_integridad() -> None:
    a = BioDatum(datum_id="d1", sealed_secret="x")
    b = BioDatum(datum_id="d2", sealed_secret="x")
    c = BioDatum(datum_id="d3", sealed_secret="y")
    assert a.seal_hash == b.seal_hash
    assert c.seal_hash != a.seal_hash
