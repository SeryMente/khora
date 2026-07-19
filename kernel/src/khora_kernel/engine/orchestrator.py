from typing import Optional

from khora_kernel.api import PuertoVision
from khora_kernel.engine.core import ask
from khora_kernel.engine.fval import fval
from khora_kernel.engine.fallback import fallback
from khora_kernel.engine.history import load_ht


def ask_with_fallback(
    question: str,
    referencia_modalidad: str,
    puerto_vision: PuertoVision,
    session_id: Optional[str] = None,
    db_path: str = "data/khora_sessions.db",
    memoria_neo4j=None
):
    """
    Orquestador de nivel superior para Core.ask() + fVAL + Fallback.
    1. Ejecuta Core.ask() (ΔCore).
    2. Ejecuta fVAL (J-C12) sobre la respuesta.
    3. Si fVAL emite vt='Insuficiente', activa el fallback (ΔFB).
    4. El fallback extrae evidencia de la modalidad (VQA) y la inyecta en Ht.
    5. Re-ejecuta Core.ask() para que ΔCore sintetice con el nuevo contexto efímero en Ht.
    6. Retorna la respuesta validada final.
    """
    # 1. Primera pasada
    resp = ask(question, session_id=session_id, db_path=db_path, memoria_neo4j=memoria_neo4j)

    # Asegurarnos de tener el session_id que se usó/generó
    current_session_id = resp.ht_ref
    ht = load_ht(current_session_id, db_path)
    if not ht:
        raise RuntimeError("No se pudo cargar el historial de sesión tras ask()")

    # 2. Evaluación inicial fVAL
    val_resp = fval(resp, ht, db_path=db_path)

    # 3. Si es insuficiente, se activa Fallback
    if val_resp.vt == "Insuficiente":
        # 4. Fallback inyecta en Ht
        fallback(
            session_id=current_session_id,
            referencia_modalidad=referencia_modalidad,
            puerto_vision=puerto_vision,
            db_path=db_path
        )

        # 5. Segunda pasada (Re-síntesis) con el contexto inyectado
        # Dado que `Core.ask()` no arrastra la evidencia previa a `context_chunks` por defecto,
        # le inyectamos la evidencia efímera explícitamente en la query en forma de contexto,
        # para que la vea sin tocar la lógica interna de Core.ask().
        ht_despues_fallback = load_ht(current_session_id, db_path)

        # Recuperamos la evidencia recién inyectada (las últimas en Ht)
        # Filtramos por las que se generaron en fallback
        evidencias_fallback = [e for e in ht_despues_fallback.evidence if e.node_id == "fallback_vqa"]
        contexto_extra = "\n".join(e.triple for e in evidencias_fallback if e.triple)

        pregunta_con_contexto = f"Contexto efímero (Evidencia Visual): {contexto_extra}\n\nPregunta original: {question}"

        resp_reintento = ask(
            pregunta_con_contexto,
            session_id=current_session_id,
            db_path=db_path,
            memoria_neo4j=memoria_neo4j
        )

        val_resp_reintento = fval(resp_reintento, ht_despues_fallback, db_path=db_path)
        return val_resp_reintento

    return val_resp
