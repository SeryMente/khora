import os

from khora_kernel.ports.transcripcion import (
    ResultadoTranscripcion,
    SegmentoTexto,
    Transcripcion,
    TranscripcionError,
)


class GroqTranscripcionAdapter(Transcripcion):
    """
    Adapter del puerto Transcripcion usando la API de Groq (Whisper).
    """

    def __init__(self, api_key: str | None = None):
        """
        Inicializa el cliente de Groq.
        El cliente se crea al montar, no al importar, y sin credenciales válidas
        el sistema puede arrancar (se usará en pruebas o fallará gracefully).
        """
        import groq

        # Si no se pasa explicitamente, intenta usar GROQ_API_KEY
        key = api_key or os.getenv("GROQ_API_KEY", "")
        # Configurado max_retries local para el vendor, encapsulado
        self._client = groq.Groq(api_key=key, max_retries=2)

    def transcribir_audio(self, audio_bytes: bytes) -> ResultadoTranscripcion:
        import groq

        try:
            # Groq requiere un tupla (filename, file_content) para archivos en memoria
            response = self._client.audio.transcriptions.create(
                file=("audio.mp3", audio_bytes),  # nombre genérico
                model="whisper-large-v3",
                response_format="verbose_json",  # Para obtener segmentos y timestamps
                prompt="Dictado en español.", # Para forzar español como predeterminado
            )

            # Formatear la respuesta al dominio
            texto = getattr(response, "text", "")
            idioma = getattr(response, "language", "es")
            segmentos = []

            if hasattr(response, "segments") and getattr(response, "segments", None):
                for seg in getattr(response, "segments", []):
                    # Convertir segundos a milisegundos
                    inicio = int(seg.get("start", 0) * 1000)
                    fin = int(seg.get("end", 0) * 1000)
                    seg_texto = seg.get("text", "")
                    segmentos.append(SegmentoTexto(inicio_ms=inicio, fin_ms=fin, texto=seg_texto))
            else:
                # Fallback si Whisper no retorna segmentos detallados
                segmentos.append(SegmentoTexto(inicio_ms=0, fin_ms=0, texto=texto))

            return ResultadoTranscripcion(
                texto_completo=texto,
                segmentos=segmentos,
                idioma_detectado=idioma,
            )

        except Exception as e:
            # Requisito innegociable: "El audio JAMÁS se pierde por una falla."
            import time
            fallback_filename = f"audio_rescate_{int(time.time())}.mp3"
            with open(fallback_filename, "wb") as f:
                f.write(audio_bytes)

            if isinstance(e, groq.AuthenticationError):
                raise TranscripcionError(f"Error de autenticación. Audio guardado en {fallback_filename}: {str(e)}") from e
            elif isinstance(e, groq.BadRequestError):
                raise TranscripcionError(f"Petición inválida a Groq. Audio guardado en {fallback_filename}: {str(e)}") from e
            else:
                raise TranscripcionError(f"Falla inesperada. Audio guardado en {fallback_filename}: {str(e)}") from e
