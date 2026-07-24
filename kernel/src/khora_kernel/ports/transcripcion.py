# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import typing
from dataclasses import dataclass


class TranscripcionError(Exception):
    """Excepción base para fallos en la Transcripción."""

    pass


class FormatoAudioInvalidoError(TranscripcionError):
    """Lanzada cuando el formato de audio no puede ser procesado."""

    pass


class DeteccionIdiomaFallidaError(TranscripcionError):
    """Lanzada cuando no se puede determinar el idioma del audio."""

    pass


@dataclass(frozen=True)
class SegmentoTexto:
    inicio_ms: int
    fin_ms: int
    texto: str


@dataclass(frozen=True)
class ResultadoTranscripcion:
    texto_completo: str
    segmentos: typing.List[SegmentoTexto]
    idioma_detectado: str


# @req: khora.puertos.transcripcion
class Transcripcion(typing.Protocol):
    def transcribir_audio(self, audio_bytes: bytes) -> ResultadoTranscripcion:
        """Transcribe bytes de audio a texto estructurado."""
        ...
