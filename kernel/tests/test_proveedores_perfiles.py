# @l0 L0-002 · @req KA-00/REQ-CHAT · @acr ACR-2.1
import os
import pytest

from khora_kernel.proveedores import (
    PerfilLLMNoConfiguradoError,
    ProveedorLLMGenerico,
    crear_proveedor_por_perfil,
    extraer_segundos_reintento,
)


def test_aislamiento_perfiles(monkeypatch):
    """Prueba que pedir perfil 'groq' construye una instancia con base_url/model de Groq y NO los de KHORA_LLM_*."""
    monkeypatch.setenv("KHORA_LLM_BASE_URL", "https://api.openai.com/v1")
    monkeypatch.setenv("KHORA_LLM_API_KEY", "key-default")
    monkeypatch.setenv("KHORA_LLM_MODEL", "gpt-4o")

    monkeypatch.setenv("KHORA_PERFIL_GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("KHORA_PERFIL_GROQ_API_KEY", "gsk-testkey")
    monkeypatch.setenv("KHORA_PERFIL_GROQ_MODEL", "llama-3.3-70b-versatile")

    proveedor = crear_proveedor_por_perfil("groq")
    assert isinstance(proveedor, ProveedorLLMGenerico)
    assert proveedor.base_url == "https://api.groq.com/openai/v1"
    assert proveedor.api_key == "gsk-testkey"
    assert proveedor.llm_model == "llama-3.3-70b-versatile"


def test_perfil_no_configurado_falla_explicito(monkeypatch):
    """Prueba que un perfil sin variables configuradas falla explícitamente citando el nombre del perfil sin fallback."""
    monkeypatch.setenv("KHORA_LLM_BASE_URL", "https://api.openai.com/v1")
    monkeypatch.setenv("KHORA_LLM_API_KEY", "key-default")
    monkeypatch.setenv("KHORA_LLM_MODEL", "gpt-4o")

    monkeypatch.delenv("KHORA_PERFIL_GEMINI_BASE_URL", raising=False)
    monkeypatch.delenv("KHORA_PERFIL_GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("KHORA_PERFIL_GEMINI_MODEL", raising=False)

    with pytest.raises(PerfilLLMNoConfiguradoError) as exc_info:
        crear_proveedor_por_perfil("gemini")

    assert exc_info.value.perfil == "gemini"
    assert "gemini" in str(exc_info.value)


def test_modelo_override_comportamiento(monkeypatch):
    """Prueba que modelo_override reemplaza el modelo si no está vacío, o se ignora si llega como string vacío."""
    monkeypatch.setenv("KHORA_PERFIL_GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("KHORA_PERFIL_GROQ_API_KEY", "gsk-testkey")
    monkeypatch.setenv("KHORA_PERFIL_GROQ_MODEL", "llama-3.3-70b-versatile")

    # String vacío -> usa el modelo por defecto del perfil
    prov_empty = crear_proveedor_por_perfil("groq", modelo_override="")
    assert prov_empty.llm_model == "llama-3.3-70b-versatile"

    prov_spaces = crear_proveedor_por_perfil("groq", modelo_override="   ")
    assert prov_spaces.llm_model == "llama-3.3-70b-versatile"

    # String válido -> sobreescribe el modelo
    prov_override = crear_proveedor_por_perfil("groq", modelo_override="mixtral-8x7b-32768")
    assert prov_override.llm_model == "mixtral-8x7b-32768"


def test_extraer_segundos_reintento_parser():
    """Prueba la extracción normalizada del tiempo de reintento desde cuerpos de mensaje y headers de error."""
    # Pattern "try again in 12.3s"
    body1 = '{"error":{"message":"Rate limit reached for model in TPM. Please try again in 12.3s."}}'
    assert extraer_segundos_reintento(body1) == 12.3

    # Pattern "try again in 500ms"
    body2 = 'Please try again in 500ms.'
    assert extraer_segundos_reintento(body2) == 0.5

    # Pattern "try again in 2m"
    body3 = 'Please try again in 2m.'
    assert extraer_segundos_reintento(body3) == 120.0

    # Header Retry-After
    headers = {"Retry-After": "45"}
    assert extraer_segundos_reintento("", headers=headers) == 45.0
