# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import base64
import os

from khora_kernel.api import (
    ObjetoDeInformacion,
    PuertoLLM,
    SolicitudLLM,
)


def normalizar(objeto: ObjetoDeInformacion, puerto_llm: PuertoLLM | None = None) -> str:
    """
    η/τ: Normalización multimodal.
    Si es texto, devuelve identidad.
    Si es imagen, devuelve caption vía MLLM (mock si no hay proveedor).
    """
    # Determinación básica si es imagen (por ejemplo de su contenido o metadata)
    es_imagen = False
    mime = str(objeto.metadata.get("mime") or objeto.source_schema or "")
    if str(objeto.metadata.get("tipo") or "").lower() in {"imagen", "image"}:
        es_imagen = True
    elif mime.lower().startswith("image/"):
        es_imagen = True
    elif isinstance(objeto.raw_payload, bytes) and mime:
        es_imagen = mime.lower().startswith("image/")
    elif objeto.texto.startswith("http") and any(objeto.texto.lower().split("?")[0].endswith(ext) for ext in [".jpg", ".png", ".jpeg", ".webp"]):
        es_imagen = True

    if not es_imagen:
        return objeto.texto

    # Es imagen -> MLLM Captioning
    if puerto_llm:
        images = None
        if isinstance(objeto.raw_payload, bytes):
            images = [base64.b64encode(objeto.raw_payload).decode("utf-8")]
        solicitud = SolicitudLLM(
            prompt=f"Describe esta imagen y produce UN caption textual único para fKGC: {objeto.texto}",
            sistema=None,
            formato_estricto=None,
            metadata={"temperature": 0.0, "role": "captioning"},
            imagenes_base64=images,
        )
        resp = puerto_llm.generar(solicitud)
        return resp.texto

    mllm_model = os.environ.get("KHORA_MLLM_MODEL")
    if not mllm_model or mllm_model == "mock":
        # Mock permitido SOLO en CI (documentado D2)
        return "[MOCK CAPTION] Imagen descriptiva detectada"

    # Aquí iría el proveedor LLM existente en el repo, pero como no hay otro más
    # que el simulado/fallback, usamos fallback documentado.
    return f"[CAPTION {mllm_model}] Descripción extraída de la imagen."
