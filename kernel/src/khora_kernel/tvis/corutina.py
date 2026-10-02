# @l0 L0-002-R · @req RAZ-02/REQ-2 · @acr ACR-2.1 · @ua UA-23,UA-24,UA-25,UA-41
import base64
import logging
from dataclasses import dataclass
from typing import List

from khora_kernel.api import PuertoLLM, SolicitudLLM

logger = logging.getLogger(__name__)


@dataclass
class ResultadoVisual:
    hallazgo_vqa: str
    entidades_consultadas: list[str]
    bytes_procesados: int


def _payload_to_base64(payload: bytes | str) -> tuple[str, int]:
    if isinstance(payload, bytes):
        return base64.b64encode(payload).decode("utf-8"), len(payload)
    text = str(payload).strip()
    if text.startswith("data:image/") and "," in text:
        return text.split(",", 1)[1], len(text)
    if text.startswith("http://") or text.startswith("https://"):
        return text, len(text)
    return text, len(text)


async def refinar_visual(
    bytes_imagen: bytes | str,
    entidades_relevantes: List[str],
    puerto_llm: PuertoLLM,
    pregunta: str = "",
) -> ResultadoVisual:
    """tVIS: fetch raw payload + neural VQA; the result never enters the PKG."""
    logger.info("[tVIS] entidades topológicas=%s", entidades_relevantes)
    imagen_base64, processed = _payload_to_base64(bytes_imagen)
    entidades_str = ", ".join(entidades_relevantes) or "(ninguna; usar solo evidencia visual)"
    prompt = (
        "Evidencia Visual VQA. Analiza el payload visual crudo observado y responde únicamente "
        "esta pregunta: " + pregunta + ". Usa solo lo visible. "
        "El subconjunto topológico relevante es: " + entidades_str
    )
    solicitud = SolicitudLLM(
        prompt=prompt,
        sistema="Eres Mvis de EpisTwin; salida efímera, no la persistas en el PKG.",
        formato_estricto=None,
        metadata={"temperature": 0.0, "role": "Mvis"},
        imagenes_base64=[imagen_base64],
    )
    respuesta = puerto_llm.generar(solicitud)
    return ResultadoVisual(
        hallazgo_vqa=respuesta.texto,
        entidades_consultadas=list(entidades_relevantes),
        bytes_procesados=processed,
    )
