import pytest

from khora_kernel.ports.mocks.mock_transcripcion import MockTranscripcion
from khora_kernel.ports.transcripcion import Transcripcion


class SuiteContratoTranscripcion:
    @pytest.fixture
    def adapter(self) -> Transcripcion:
        raise NotImplementedError

    def test_transcribir(self, adapter: Transcripcion) -> None:
        audio = b"dummy audio bytes"
        res = adapter.transcribir_audio(audio)

        assert res.texto_completo
        assert res.idioma_detectado
        assert len(res.segmentos) > 0
        assert res.segmentos[0].texto in res.texto_completo


class TestMockTranscripcion(SuiteContratoTranscripcion):
    @pytest.fixture
    def adapter(self) -> Transcripcion:
        return MockTranscripcion()


class _RotoTranscripcion(Transcripcion):
    def transcribir_audio(self, audio_bytes: bytes):
        from khora_kernel.ports.transcripcion import ResultadoTranscripcion

        # Falla: devuelve segmentos vacíos
        return ResultadoTranscripcion("texto", [], "es")


def test_roto_falla_contrato_transcripcion():
    suite = SuiteContratoTranscripcion()
    adapter = _RotoTranscripcion()
    with pytest.raises(AssertionError):
        suite.test_transcribir(adapter)
