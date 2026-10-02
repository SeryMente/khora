# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
"""Compatibilidad de import histórico para el proveedor OpenAI-compatible."""
from .llm_generico import ProveedorLLMGenerico


class ProveedorOpenAICompatible(ProveedorLLMGenerico):
    """Alias explícito: no altera el contrato del proveedor actual."""
