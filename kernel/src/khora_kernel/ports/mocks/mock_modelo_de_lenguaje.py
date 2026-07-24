# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
from ..modelo_de_lenguaje import (
    ConsumoDeTokens,
    LimiteDeTokensExcedidoError,
    ModeloDeLenguaje,
    RespuestaModelo,
)


class MockModeloDeLenguaje(ModeloDeLenguaje):
    def generar_texto(self, prompt: str, max_tokens: int = 1000) -> RespuestaModelo:
        # Aproximación simple: 1 caracter ~= 1 token para simular consumo
        if max_tokens < 10:
            raise LimiteDeTokensExcedidoError("Límite de tokens demasiado bajo.")

        salida = f"Respuesta a: {prompt}"
        consumo = ConsumoDeTokens(
            tokens_entrada=len(prompt),
            tokens_salida=len(salida),
            tokens_totales=len(prompt) + len(salida),
        )

        return RespuestaModelo(texto=salida, consumo=consumo, razon_finalizacion="stop")
