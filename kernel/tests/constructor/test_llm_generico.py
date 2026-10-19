# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1

from unittest.mock import MagicMock, patch

from khora_kernel.proveedores.llm_generico import ProveedorLLMGenerico
from khora_kernel.api import SolicitudLLM


def test_embeddings_override_env_vars(monkeypatch):
    monkeypatch.setenv("KHORA_LLM_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("KHORA_LLM_API_KEY", "groq-key")
    monkeypatch.setenv("KHORA_EMBEDDINGS_BASE_URL", "https://api.openai.com/v1")
    monkeypatch.setenv("KHORA_EMBEDDINGS_API_KEY", "openai-embeddings-key")

    prov = ProveedorLLMGenerico()

    mock_response = MagicMock()
    mock_response.read.return_value = b'{"data": [{"index": 0, "embedding": [0.1, 0.2]}]}'
    mock_response.__enter__.return_value = mock_response

    with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
        vecs = prov.incrustar(["test text"])
        assert vecs == [[0.1, 0.2]]

        req = mock_urlopen.call_args[0][0]
        assert req.full_url == "https://api.openai.com/v1/embeddings"
        assert req.headers["Authorization"] == "Bearer openai-embeddings-key"
        assert req.get_header("User-agent") == "Khora-Kernel/1.0"


def test_embeddings_fallback_default(monkeypatch):
    monkeypatch.setenv("KHORA_LLM_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("KHORA_LLM_API_KEY", "groq-key")
    monkeypatch.delenv("KHORA_EMBEDDINGS_BASE_URL", raising=False)
    monkeypatch.delenv("KHORA_EMBEDDINGS_API_KEY", raising=False)

    prov = ProveedorLLMGenerico()

    mock_response = MagicMock()
    mock_response.read.return_value = b'{"data": [{"index": 0, "embedding": [0.3, 0.4]}]}'
    mock_response.__enter__.return_value = mock_response

    with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
        vecs = prov.incrustar(["test text"])
        assert vecs == [[0.3, 0.4]]

        req = mock_urlopen.call_args[0][0]
        assert req.full_url == "https://api.groq.com/openai/v1/embeddings"
        assert req.headers["Authorization"] == "Bearer groq-key"
        assert req.get_header("User-agent") == "Khora-Kernel/1.0"


def test_generar_identifies_kernel_without_exposing_key():
    provider = ProveedorLLMGenerico("https://provider.invalid/v1", "test-key", "test-model")
    response = MagicMock()
    response.read.return_value = b'{"choices":[{"message":{"content":"ok"}}]}'
    response.__enter__.return_value = response
    with patch("urllib.request.urlopen", return_value=response) as opened:
        result = provider.generar(SolicitudLLM("public test", None, None, {}))
        assert result.texto == "ok"
        request = opened.call_args[0][0]
        assert request.get_header("User-agent") == "Khora-Kernel/1.0"
        assert request.get_header("Authorization") == "Bearer test-key"


def test_generar_stream_identifies_kernel():
    provider = ProveedorLLMGenerico("https://provider.invalid/v1", "test-key", "test-model")
    response = MagicMock()
    response.__iter__.return_value = iter([b'data: {"choices":[{"delta":{"content":"ok"}}]}', b'data: [DONE]'])
    with patch("urllib.request.urlopen", return_value=response) as opened:
        assert "ok" in list(provider.generar_stream([{"role":"user","content":"public test"}]))
        request = opened.call_args[0][0]
        assert request.get_header("User-agent") == "Khora-Kernel/1.0"
