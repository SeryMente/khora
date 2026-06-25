"""Prueba real Caja Negra v0: cifra y no re-expone el payload sellado."""
from pathlib import Path

from cryptography.fernet import Fernet

from comind.blackbox.biodatum import BioDatum
from comind.blackbox.store import list_public, load_or_create_key, seal


def test_no_reexpone_texto_plano(tmp_path: Path) -> None:
    secret = "confesion-intima-12345"
    record = seal(BioDatum(datum_id="d1", sealed_secret=secret), tmp_path)
    assert "sealed_secret" not in record
    assert record["sealed_token"] != secret
    raw = (tmp_path / "blackbox.jsonl").read_text(encoding="utf-8")
    assert secret not in raw


def test_listado_publico_oculta_payload(tmp_path: Path) -> None:
    secret = "otro-secreto-xyz"
    seal(BioDatum(datum_id="d2", sealed_secret=secret), tmp_path)
    rows = list_public(tmp_path)
    assert len(rows) == 1
    assert "sealed_secret" not in rows[0]
    assert secret not in rows[0].values()


def test_cifrado_recuperable_con_llave(tmp_path: Path) -> None:
    secret = "recuperable-001"
    record = seal(BioDatum(datum_id="d3", sealed_secret=secret), tmp_path)
    key = load_or_create_key(tmp_path)
    token = str(record["sealed_token"]).encode("ascii")
    assert Fernet(key).decrypt(token).decode("utf-8") == secret
