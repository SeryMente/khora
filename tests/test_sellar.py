import hashlib

from fastapi.testclient import TestClient

from khora import api


def test_sellar_no_filtra_plano_ni_huella(tmp_path, monkeypatch):
    monkeypatch.setenv("KHORA_BLACKBOX_ROOT", str(tmp_path))
    secreto = "dato-privado-irrepetible-xyz-123"
    huella = hashlib.sha256(secreto.encode("utf-8")).hexdigest()

    client = TestClient(api.app)
    resp = client.post("/sellar", json={"texto": secreto, "etiqueta": "relacional"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert len(body["acuse"]) == 32
    assert body["labels"] == ["relacional"]
    assert secreto not in resp.text
    assert huella not in resp.text
    store_file = tmp_path / "blackbox.jsonl"
    assert store_file.exists()
    assert secreto not in store_file.read_text(encoding="utf-8")


def test_sellar_rechaza_vacio():
    client = TestClient(api.app)
    assert client.post("/sellar", json={"texto": "   "}).status_code == 400
