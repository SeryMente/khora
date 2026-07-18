import typing
from dataclasses import dataclass


class ModeloDeLenguajeError(Exception):
    """Excepción base para fallos en el Modelo de Lenguaje."""

    pass


class LimiteDeTokensExcedidoError(ModeloDeLenguajeError):
    """Lanzada cuando la respuesta o prompt excede el máximo permitido."""

    pass


class FiltroDeSeguridadActivadoError(ModeloDeLenguajeError):
    """Lanzada cuando se activa un filtro de seguridad en el vendor (abstraído)."""

    pass


@dataclass(frozen=True)
class ConsumoDeTokens:
    tokens_entrada: int
    tokens_salida: int
    tokens_totales: int


@dataclass(frozen=True)
class RespuestaModelo:
    texto: str
    consumo: ConsumoDeTokens
    razon_finalizacion: str


# @req: khora.puertos.lenguaje
class ModeloDeLenguaje(typing.Protocol):
    def generar_texto(self, prompt: str, max_tokens: int = 1000) -> RespuestaModelo:
        """Genera texto a partir de un prompt."""
        ...
