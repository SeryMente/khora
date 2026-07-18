from ..transcripcion import (
    FormatoAudioInvalidoError,
    ResultadoTranscripcion,
    SegmentoTexto,
    Transcripcion,
)


class MockTranscripcion(Transcripcion):
    def transcribir_audio(self, audio_bytes: bytes) -> ResultadoTranscripcion:
        if not audio_bytes:
            raise FormatoAudioInvalidoError("Bytes de audio vacíos.")

        # Simulamos la transcripción
        texto = f"Transcripción de {len(audio_bytes)} bytes."
        segmentos = [
            SegmentoTexto(inicio_ms=0, fin_ms=1000, texto="Transcripción de"),
            SegmentoTexto(
                inicio_ms=1000, fin_ms=2000, texto=f"{len(audio_bytes)} bytes."
            ),
        ]

        return ResultadoTranscripcion(
            texto_completo=texto, segmentos=segmentos, idioma_detectado="es"
        )
