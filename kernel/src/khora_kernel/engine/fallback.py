import uuid
from typing import Optional

from khora_kernel.api import PuertoVision
from khora_kernel.engine.history import Ht, HtEvidence, load_ht, save_ht


def fallback(
    session_id: str,
    pregunta: str,
    referencia_modalidad: str,
    puerto_vision: PuertoVision,
    db_path: str = "data/khora_sessions.db"
) -> None:
    """
    Agente de respaldo (ΔFB).
    Se activa cuando fVAL emite vt=Insuficiente.
    Accede a la modalidad cruda (ej. imagen) a través de PuertoVision,
    extrae evidencia y la inyecta al historial Ht como contexto efímero de la sesión.
    JAMÁS escribe al PKG (Neo4j).
    """
    ht = load_ht(session_id, db_path)
    if not ht:
        return

    # 1. Contextual Fetching
    # Extraer payload crudo (ej. imagen base64/URL) a través del puerto
    imagen_cruda = puerto_vision.extraer_evidencia(referencia_modalidad)

    # 2. Neural VQA Injection
    from khora_kernel.proveedores.openai import ProveedorOpenAICompatible
    from khora_kernel.api import SolicitudLLM

    proveedor = ProveedorOpenAICompatible()
    solicitud = SolicitudLLM(
        prompt=f"Por favor, responde a la siguiente pregunta observando la imagen provista: {pregunta}",
        sistema="Eres un asistente experto analizando imágenes. Debes extraer la evidencia solicitada con precisión.",
        formato_estricto=None,
        metadata={"temperature": 0.0},
        imagenes_base64=[imagen_cruda] if imagen_cruda else None
    )

    try:
        respuesta_mllm = proveedor.generar(solicitud)
        evidencia_cruda_texto = respuesta_mllm.texto
    except Exception as e:
        evidencia_cruda_texto = f"Error en VQA: {e}"

    # Crear evidencia para el historial
    from khora_kernel.engine.core import _add_evidence, _add_step

    # Añadimos un paso de transición en el historial
    ht_con_paso = _add_step(ht, "FALLBACK", f"Activando ΔFB. Obteniendo evidencia de {referencia_modalidad}")

    evidencia_efimera = HtEvidence(
        node_id="fallback_vqa",
        triple=evidencia_cruda_texto,
        source_step=len(ht_con_paso.steps)
    )

    ht_actualizado = _add_evidence(ht_con_paso, [evidencia_efimera])

    save_ht(ht_actualizado, db_path)
