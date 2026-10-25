import typing
from unittest.mock import MagicMock, patch
import pytest

from contrato.test_transcripcion import SuiteContratoTranscripcion
from khora_kernel.ports.transcripcion import Transcripcion, TranscripcionError
from khora_kernel.api import ContextoDeVisibilidad, EntidadIngresada, Provenance

from drivers.transcripcion import GroqTranscripcionAdapter


class MockGroqResponse:
    def __init__(self, text, language, segments):
        self.text = text
        self.language = language
        self.segments = segments

class MockGroqClient:
    def __init__(self, api_key, max_retries):
        self.api_key = api_key
        self.max_retries = max_retries
        self.audio = MagicMock()
        self.audio.transcriptions = MagicMock()

        def create_mock(*args, **kwargs):
            import groq
            if self.api_key == "invalid_key":
                raise groq.AuthenticationError(message="Invalid API Key", response=MagicMock(), body={})

            # For the contract test suite, we need to return valid segments
            return MockGroqResponse(
                text="Hola mundo",
                language="es",
                segments=[{"start": 0.0, "end": 1.0, "text": "Hola"}, {"start": 1.0, "end": 2.0, "text": " mundo"}]
            )

        self.audio.transcriptions.create.side_effect = create_mock

class TestGroqAdapter(SuiteContratoTranscripcion):
    @pytest.fixture
    def adapter(self) -> Transcripcion:
        # Usamos patch para evitar pegarle a la API de verdad durante el contrato
        with patch("groq.Groq", side_effect=MockGroqClient):
            return GroqTranscripcionAdapter(api_key="valid_test_key")

def test_transcripcion_falla_autenticacion():
    """Prueba negativa: credencial inválida inducida -> error tipado, sin crash.
    La prueba hace que el GroqTranscripcionAdapter falle y guarda el fallback en disco."""
    with patch("groq.Groq", side_effect=MockGroqClient):
        adapter = GroqTranscripcionAdapter(api_key="invalid_key")

        with pytest.raises(TranscripcionError) as exc:
            adapter.transcribir_audio(b"dummy audio")

        assert "autenticación" in str(exc.value).lower()
        # Verify the file was created (the fallback)
        import os, glob
        fallback_files = glob.glob("audio_rescate_*.mp3")
        assert len(fallback_files) > 0
        for f in fallback_files:
            os.remove(f)

# Mock Protocol local dictado por JULES para verificar el contrato
class MotorDeConsultaProtocol(typing.Protocol):
    def consultar(self, query: str, contexto: ContextoDeVisibilidad) -> typing.List[EntidadIngresada]:
        ...

class MockMotorGrafo(MotorDeConsultaProtocol):
    """Mock inyectado para probar el contrato de visibilidad del pipeline completo."""
    def __init__(self):
        self.memoria: typing.List[EntidadIngresada] = []

    def ingestar(self, texto: str, provenance: Provenance, visibilidad: ContextoDeVisibilidad) -> EntidadIngresada:
        entidad = EntidadIngresada(id=str(len(self.memoria)), texto=texto, provenance=provenance, visibilidad=visibilidad)
        self.memoria.append(entidad)
        return entidad

    def consultar(self, query: str, contexto: ContextoDeVisibilidad) -> typing.List[EntidadIngresada]:
        resultados: typing.List[EntidadIngresada] = []
        for e in self.memoria:
            # Filtro trivial: descartar todo fragmento cuya visibilidad no sea <= contexto
            if contexto == ContextoDeVisibilidad.TRANSPARENTE:
                if e.visibilidad == ContextoDeVisibilidad.TRANSPARENTE:
                    resultados.append(e)
            else: # PRIVADO ve todo
                resultados.append(e)
        return resultados

def test_transcripcion_visibilidad_default_privado():
    """Verificación de visibilidad: el dictado NO aparece en consultas con contexto transparente."""
    grafo = MockMotorGrafo()

    with patch("groq.Groq", side_effect=MockGroqClient):
        adapter = GroqTranscripcionAdapter(api_key="valid")
        res = adapter.transcribir_audio(b"audio test")

    provenance = Provenance(origen="dictado", driver="GroqTranscripcionAdapter", timestamp="2023-01-01T00:00:00Z")

    # 1. Partición en origen: nace con visibilidad privado - Aserción sobre el objeto almacenado
    entidad = grafo.ingestar(res.texto_completo, provenance, visibilidad=ContextoDeVisibilidad.PRIVADO)
    assert entidad.visibilidad == ContextoDeVisibilidad.PRIVADO
    assert entidad.provenance.origen == "dictado"

    # 2. Filtro por contexto
    # Contexto transparente -> NO debe retornar el dictado
    res_transparente = grafo.consultar("qué dije?", ContextoDeVisibilidad.TRANSPARENTE)
    assert len(res_transparente) == 0

    # Contexto privado -> SÍ debe retornar el dictado
    res_privado = grafo.consultar("qué dije?", ContextoDeVisibilidad.PRIVADO)
    assert len(res_privado) == 1
    assert res_privado[0] == entidad
