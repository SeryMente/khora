#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/khora
[ -d .venv ] && source .venv/bin/activate || true

echo "== [1] /sellar en src/khora/api.py (archivo completo) =="
cat > src/khora/api.py <<'EOF'
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from khora import inbox, store, usage
from khora.blackbox.biodatum import BioDatum
from khora.blackbox.store import seal

app = FastAPI(title="Khora API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _blackbox_root() -> Path:
    return Path(os.environ.get("KHORA_BLACKBOX_ROOT", "~/.khora/blackbox")).expanduser()


class CaptureRequest(BaseModel):
    texto: str


class CaptureResponse(BaseModel):
    ok: bool
    id: str | None = None


class CapturaItem(BaseModel):
    id: str
    texto: str
    timestamp: str


class CapturasResponse(BaseModel):
    capturas: list[CapturaItem]


class SellarRequest(BaseModel):
    texto: str
    etiqueta: str = "sin-etiqueta"


class SellarResponse(BaseModel):
    ok: bool
    acuse: str
    labels: list[str]


@app.post("/sellar", response_model=SellarResponse)
def sellar(request: SellarRequest) -> SellarResponse:
    if not request.texto.strip():
        raise HTTPException(status_code=400, detail="texto vacio")
    datum = BioDatum(
        datum_id=uuid.uuid4().hex,
        sealed_secret=request.texto,
        source="camara-de-ecos",
        labels=[request.etiqueta],
    )
    record = seal(datum, _blackbox_root())
    usage.record_capture()
    labels_raw = record.get("labels", [])
    labels = [str(x) for x in labels_raw] if isinstance(labels_raw, list) else []
    return SellarResponse(ok=True, acuse=str(record["datum_id"]), labels=labels)


@app.post("/capturar", response_model=CaptureResponse)
def capturar(request: CaptureRequest) -> CaptureResponse:
    capture = inbox.add(request.texto, source="web")
    usage.record_capture()
    return CaptureResponse(ok=True, id=capture.id)


@app.get("/capturas", response_model=CapturasResponse)
def obtener_capturas() -> CapturasResponse:
    capturas = store.fetch_all_captures()
    capturas_sorted = sorted(capturas, key=lambda c: c.timestamp, reverse=True)
    items = [
        CapturaItem(id=c.id, texto=c.text, timestamp=c.timestamp.isoformat())
        for c in capturas_sorted
    ]
    return CapturasResponse(capturas=items)


@app.get("/adherence")
def adherence(weeks: int = 4):
    return usage.adherence_summary(weeks=weeks)
EOF

echo "== [2] juez congelado: tests/test_sellar.py =="
cat > tests/test_sellar.py <<'EOF'
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
EOF

echo "== [JUEZ] formato + tipos + tests =="
ruff check src tests && pyright && pytest -q tests/test_sellar.py

echo "== [PRUEBA REAL] levantando servidor y probando /sellar =="
export KHORA_BLACKBOX_ROOT="$PWD/.bbx-demo"
uvicorn khora.api:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
sleep 2
curl -s -X POST localhost:8000/sellar -H 'Content-Type: application/json' \
  -d '{"texto":"secreto-de-prueba-123","etiqueta":"relacional"}'
echo
grep -c "secreto-de-prueba-123" "$KHORA_BLACKBOX_ROOT/blackbox.jsonl" || echo "0 (plano NO esta en claro) OK"
kill $SERVER_PID

echo "== [COMMIT + PUSH] =="
git add -A && git commit -m "BBX-0A: endpoint /sellar (sellado a ciegas, acuse opaco)" && git push
