import pytest

from khora_kernel.ports.mocks.mock_modelo_de_lenguaje import MockModeloDeLenguaje
from khora_kernel.ports.modelo_de_lenguaje import ModeloDeLenguaje


class SuiteContratoModeloDeLenguaje:
    @pytest.fixture
    def adapter(self) -> ModeloDeLenguaje:
        raise NotImplementedError

    def test_generar_texto(self, adapter: ModeloDeLenguaje) -> None:
        res = adapter.generar_texto("Hola, ¿cómo estás?", max_tokens=50)
        assert res.texto
        assert res.razon_finalizacion
        assert res.consumo.tokens_totales > 0
        assert (
            res.consumo.tokens_totales
            == res.consumo.tokens_entrada + res.consumo.tokens_salida
        )


class TestMockModeloDeLenguaje(SuiteContratoModeloDeLenguaje):
    @pytest.fixture
    def adapter(self) -> ModeloDeLenguaje:
        return MockModeloDeLenguaje()


class _RotoModeloDeLenguaje(ModeloDeLenguaje):
    def generar_texto(self, prompt: str, max_tokens: int = 1000):
        from khora_kernel.ports.modelo_de_lenguaje import (
            ConsumoDeTokens,
            RespuestaModelo,
        )

        # Falla: tokens_totales incorrecto
        return RespuestaModelo("texto", ConsumoDeTokens(10, 10, 999), "stop")


def test_roto_falla_contrato_llm():
    suite = SuiteContratoModeloDeLenguaje()
    adapter = _RotoModeloDeLenguaje()
    with pytest.raises(AssertionError):
        suite.test_generar_texto(adapter)
