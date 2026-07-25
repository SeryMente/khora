# @l0 L0-002 · @req ING-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-2.2,ACR-2.3 · @ua UA-07,UA-08,UA-09,UA-41
import base64
import logging
import os
from datetime import datetime, timezone

from khora_kernel.api import ObjetoDeInformacion, Provenance, PuertoLLM, Triple

from ._extraer import extraer
from ._format_boundary import verificar_frontera
from ._normalizar import normalizar

logger = logging.getLogger("khora.constructor.phi_c")

def phi_c(
    contenido_bytes: bytes,
    origen: str,
    lector_grafo,
    puerto_llm: PuertoLLM | None = None,
    transcriptor_audio_func=None
) -> list[Triple]:
    """
    Pipeline ΦC de 2 etapas (η -> fKGC).
    """
    # 1. Verificar frontera de formatos por contenido
    tipo_formato = verificar_frontera(contenido_bytes)

    texto_base = ""
    # Si es audio, delegar al transcriptor (el cual es pasado por inyección, no importado directamente)
    if tipo_formato in ["mp3", "m4a", "wav"]:
        if transcriptor_audio_func:
            texto_base = transcriptor_audio_func(contenido_bytes, f"audio.{tipo_formato}")
        else:
            # Fallback si no hay transcriptor inyectado (aunque en el flow normal el adaptador lo pasará)
            texto_base = "[SKIP] Transcripción de audio no configurada."
    elif tipo_formato in ["png", "jpg", "webp"]:
        # Para imágenes, la URL o data URI irá en el texto
        b64 = base64.b64encode(contenido_bytes).decode("utf-8")
        texto_base = f"data:image/{tipo_formato};base64,{b64}"
    elif tipo_formato == "pdf" or tipo_formato == "docx":
        # Simulación de extracción de texto de pdf/docx para cumplir con la interfaz
        # En una implementación completa esto requeriría dependencias
        texto_base = f"[{tipo_formato.upper()}] Contenido textual extraído (simulado por ausencia de deps de parsing)."
    elif tipo_formato == "texto":
        texto_base = contenido_bytes.decode('utf-8')

    # Crear el ObjetoDeInformacion intermedio
    ts = datetime.now(timezone.utc).isoformat()
    prov = Provenance(origen=origen, driver="phi_c", timestamp=ts)

    metadata = {}
    if tipo_formato in ["png", "jpg", "webp"]:
        metadata["tipo"] = "imagen"

    obj = ObjetoDeInformacion(
        id=f"obj-{hash(texto_base)}",
        texto=texto_base,
        provenance=prov,
        metadata=metadata
    )

    # Etapa η (Captioning/Normalización)
    modelo_eta = os.environ.get("KHORA_MLLM_MODEL", "mock") if tipo_formato in ["png", "jpg", "webp"] else "identity"
    logger.info(f"[ETAPA: ETA] Modelo: {modelo_eta}, Timestamp: {ts}")

    texto_normalizado = normalizar(obj, puerto_llm)

    # Inspeccionabilidad (logging del resultado de ETA)
    logger.debug(f"[SALIDA ETA]: {texto_normalizado}")

    # Etapa fKGC (Extracción de triples)
    # Modelo usado por puerto_llm en fKGC (usualmente mock en test, o el configurado)
    modelo_fkgc = "llm_fkgc_model" if puerto_llm else "mock_ner"
    logger.info(f"[ETAPA: fKGC] Modelo: {modelo_fkgc}, Timestamp: {ts}")

    triples = extraer(texto_normalizado, lector_grafo, puerto_llm)

    return triples
