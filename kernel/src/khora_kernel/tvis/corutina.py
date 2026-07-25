# @l0 L0-002 · @req VIS-01/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1 · @ua UA-22,UA-23,UA-24,UA-25

import base64
import logging
from dataclasses import dataclass
from typing import List

from khora_kernel.api import PuertoLLM, SolicitudLLM

logger = logging.getLogger(__name__)


@dataclass
class ResultadoVisual:
    """Retorno efímero de tVIS. El llamador (RAZ-02) lo convierte
    a HtEvidence antes de escribir a Ht."""
    hallazgo_vqa: str
    entidades_consultadas: list[str]
    bytes_procesados: int


async def refinar_visual(
    bytes_imagen: bytes,
    entidades_relevantes: List[str],
    puerto_llm: PuertoLLM,
) -> ResultadoVisual:
    """
    Co-rutina efímera para refinamiento visual (tVIS).
    Toma bytes de imagen crudos, los pasa a Base64, e invoca al PuertoLLM para VQA
    basado en las entidades topológicamente relevantes.
    NO persiste nada a Neo4j (estrictamente efímera).
    """
    # ACR-1.2: Trazabilidad del subconjunto consultado (topológicamente relevante)
    logger.info(f"[tVIS] Iniciando refinamiento visual. Entidades relevantes: {entidades_relevantes}")

    # Convertir bytes crudos a Base64
    imagen_base64 = base64.b64encode(bytes_imagen).decode("utf-8")

    # Construir prompt
    entidades_str = ", ".join(entidades_relevantes)
    prompt = f"Analiza la imagen considerando las siguientes entidades clave: {entidades_str}. Extrae evidencia relevante."

    solicitud = SolicitudLLM(
        prompt=prompt,
        sistema="Eres un asistente experto analizando imágenes en el contexto de entidades específicas.",
        formato_estricto=None,
        metadata={"temperature": 0.0},
        imagenes_base64=[imagen_base64]
    )

    try:
        respuesta = puerto_llm.generar(solicitud)
        texto_evidencia = respuesta.texto
    except Exception as e:
        logger.error(f"[tVIS] Error en VQA: {e}")
        texto_evidencia = f"Error en VQA: {e}"

    # Retornar evidencia efímera (será agregada al historial por quien llama, tVIS muere aquí)
    return ResultadoVisual(
        hallazgo_vqa=texto_evidencia,
        entidades_consultadas=entidades_relevantes,
        bytes_procesados=len(bytes_imagen)
    )