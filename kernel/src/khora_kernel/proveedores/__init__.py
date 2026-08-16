# @l0 L0-002-R · @req KA-00/REQ-2,ING-03/REQ-1,API-00/REQ-1 · @acr ACR-1.2
from .llm_generico import ProveedorLLMGenerico

ProveedorOpenAICompatible = ProveedorLLMGenerico

__all__ = ["ProveedorLLMGenerico", "ProveedorOpenAICompatible"]
