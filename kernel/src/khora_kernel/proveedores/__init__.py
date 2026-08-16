# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
from .llm_generico import ProveedorLLMGenerico

ProveedorOpenAICompatible = ProveedorLLMGenerico

__all__ = ["ProveedorLLMGenerico", "ProveedorOpenAICompatible"]
