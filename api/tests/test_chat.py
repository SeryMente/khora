# @l0 L0-002 · @req API-00/REQ-CHAT · @acr ACR-2.1
import json
import os
import sys
import urllib.error
import pytest

# Asegurar que la raíz del proyecto es importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from api.main import app

os.environ["KHORA_API_KEY"] = "test-key-123"
client = TestClient(app)


def test_chat_sin_key():
    response = client.post("/api/v1/chat", json={"perfil": "groq", "mensajes": [{"rol": "user", "contenido": "hola"}]})
    assert response.status_code == 401


def test_chat_perfil_no_configurado(monkeypatch):
    monkeypatch.delenv("KHORA_PERFIL_GEMINI_BASE_URL", raising=False)
    monkeypatch.delenv("KHORA_PERFIL_GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("KHORA_PERFIL_GEMINI_MODEL", raising=False)

    headers = {"X-Khora-Key": "test-key-123"}
    response = client.post(
        "/api/v1/chat",
        json={"perfil": "gemini", "mensajes": [{"rol": "user", "contenido": "hola"}]},
        headers=headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "detail" in data
    assert data["detail"]["error"] == "PERFIL_NO_CONFIGURADO"
    assert data["detail"]["perfil"] == "gemini"


def test_chat_rate_limit_normalizado(monkeypatch):
    # Simula un proveedor que arroja 429 en la llamada inicial
    def mock_generar_stream(self, mensajes, temperature=0.0):
        body = b'{"error":{"message":"Rate limit reached. Please try again in 12.3s."}}'
        err = urllib.error.HTTPError(
            url="http://fake",
            code=429,
            msg="Too Many Requests",
            hdrs={"Retry-After": "12"},
            fp=None
        )
        err.read = lambda: body
        raise err

    monkeypatch.setenv("KHORA_PERFIL_OPEN_SOURCE_BASE_URL", "https://api.fake.com/v1")
    monkeypatch.setenv("KHORA_PERFIL_OPEN_SOURCE_API_KEY", "fake-key")
    monkeypatch.setenv("KHORA_PERFIL_OPEN_SOURCE_MODEL", "fake-model")

    from khora_kernel.proveedores import ProveedorLLMGenerico
    monkeypatch.setattr(ProveedorLLMGenerico, "generar_stream", mock_generar_stream)

    headers = {"X-Khora-Key": "test-key-123"}
    response = client.post(
        "/api/v1/chat",
        json={"perfil": "open_source", "mensajes": [{"rol": "user", "contenido": "hola"}]},
        headers=headers,
    )
    assert response.status_code == 429
    data = response.json()
    assert data["detail"]["error"] == "RATE_LIMIT"
    assert data["detail"]["perfil"] == "open_source"
    assert data["detail"]["reintentar_en_segundos"] in (12.0, 12.3)


def test_chat_integracion_groq_en_vivo():
    groq_key = os.environ.get("KHORA_PERFIL_GROQ_API_KEY") or os.environ.get("KHORA_LLM_API_KEY")
    if not groq_key or not groq_key.startswith("gsk_"):
        pytest.skip("KHORA_PERFIL_GROQ_API_KEY no presente o no válida en el entorno de ejecucion local/CI")

    base_url = os.environ.get("KHORA_PERFIL_GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    model = os.environ.get("KHORA_PERFIL_GROQ_MODEL", "llama-3.3-70b-versatile")

    os.environ["KHORA_PERFIL_GROQ_BASE_URL"] = base_url
    os.environ["KHORA_PERFIL_GROQ_API_KEY"] = groq_key
    os.environ["KHORA_PERFIL_GROQ_MODEL"] = model

    headers = {"X-Khora-Key": "test-key-123"}
    response = client.post(
        "/api/v1/chat",
        json={
            "perfil": "groq",
            "mensajes": [{"rol": "user", "contenido": "Responde estrictamente con la palabra OK."}],
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    lines = response.text.split("\n")
    data_events = []
    for line in lines:
        if line.startswith("data: "):
            payload_raw = line[6:].strip()
            if payload_raw:
                data_events.append(json.loads(payload_raw))

    assert len(data_events) > 0
    tipos = [e.get("tipo") for e in data_events]
    assert "chunk" in tipos
    assert tipos[-1] == "fin"

    # Verificar que al menos un chunk contiene texto real
    textos = [e.get("texto", "") for e in data_events if e.get("tipo") == "chunk"]
    texto_completo = "".join(textos)
    assert len(texto_completo.strip()) > 0
