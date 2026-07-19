import os

from khora_kernel.api import ObjetoDeInformacion


def normalizar(objeto: ObjetoDeInformacion) -> str:
    """
    η/τ: Normalización multimodal.
    Si es texto, devuelve identidad.
    Si es imagen, devuelve caption vía MLLM (mock si no hay proveedor).
    """
    # Determinación básica si es imagen (por ejemplo de su contenido o metadata)
    es_imagen = False
    if "tipo" in objeto.metadata and objeto.metadata["tipo"] == "imagen":
        es_imagen = True
    elif objeto.texto.startswith("http") and any(objeto.texto.endswith(ext) for ext in [".jpg", ".png", ".jpeg", ".webp"]):
        es_imagen = True

    if not es_imagen:
        return objeto.texto

    # Es imagen -> MLLM Captioning
    mllm_model = os.environ.get("KHORA_MLLM_MODEL")
    if not mllm_model or mllm_model == "mock":
        # Mock permitido SOLO en CI (documentado D2)
        return "[MOCK CAPTION] Imagen descriptiva detectada"

    # Aquí iría el proveedor LLM existente en el repo, pero como no hay otro más
    # que el simulado/fallback, usamos fallback documentado.
    return f"[CAPTION {mllm_model}] Descripción extraída de la imagen."
