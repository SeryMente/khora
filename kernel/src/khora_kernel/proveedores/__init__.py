# @l0 L0-002-R · @req KA-00/REQ-CHAT,ING-03/REQ-1,API-00/REQ-1 · @acr ACR-1.2
from .llm_generico import (
    PerfilLLMNoConfiguradoError,
    ProveedorLLMGenerico,
    crear_proveedor_por_perfil,
    extraer_segundos_reintento,
)

ProveedorOpenAICompatible = ProveedorLLMGenerico

__all__ = [
    "ProveedorLLMGenerico",
    "ProveedorOpenAICompatible",
    "PerfilLLMNoConfiguradoError",
    "crear_proveedor_por_perfil",
    "extraer_segundos_reintento",
]
