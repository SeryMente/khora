import uuid
from typing import Optional

from khora_kernel.api import PuertoVision
from khora_kernel.engine.history import Ht, HtEvidence, load_ht, save_ht


def fallback(
    session_id: str,
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

    # Extraer evidencia cruda (VQA simulado / real a través del puerto)
    evidencia_cruda_texto = puerto_vision.extraer_evidencia(referencia_modalidad)

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
