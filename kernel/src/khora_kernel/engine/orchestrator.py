# @l0 L0-002-R · @req RAZ-02/REQ-2 · @acr ACR-2.1 · @ua UA-20,UA-21,UA-22,UA-44,UA-45
from typing import Optional

from khora_kernel.api import PuertoVision
from khora_kernel.engine import core as core_module
from khora_kernel.engine.core import ValidatedResponse
from khora_kernel.engine.fallback import run_fallback
from khora_kernel.engine.fval import fval
from khora_kernel.engine.history import load_ht


def _ask_core(*args, **kwargs):
    return core_module.ask(*args, **kwargs)


ask = _ask_core


def ask_with_fallback(
    question: str,
    referencia_modalidad: str,
    puerto_vision: PuertoVision,
    session_id: Optional[str] = None,
    db_path: str = "data/khora_sessions.db",
    memoria_grafo=None,
    memoria_neo4j=None,
):
    """Compatibilidad doble: usa el Core real y conserva el adaptador histórico de tests."""
    memoria = memoria_grafo if memoria_grafo is not None else memoria_neo4j
    first = ask(
        question, session_id=session_id, db_path=db_path, memoria_grafo=memoria, memoria_neo4j=memoria_neo4j
    )
    # Ruta real de EpisTwin: Core ya ejecutó fVAL globalmente.
    if isinstance(first, ValidatedResponse):
        if not first.delta_fb:
            return first
        current_id = first.response.ht_ref
        fallback_provider = core_module._get_provider()
        run_fallback(
            session_id=current_id, pregunta=question, referencia_modalidad=referencia_modalidad,
            puerto_vision=puerto_vision, puerto_llm=fallback_provider, db_path=db_path,
        )
        return ask(
            question, session_id=current_id, db_path=db_path,
            memoria_grafo=memoria, memoria_neo4j=memoria_neo4j,
        )
    current_id = first.ht_ref

    ht = load_ht(current_id, db_path)
    if ht is None:
        return first
    validated = fval(first, ht, db_path)
    if getattr(validated, "vt", None) != "Insuficiente":
        return validated

    # El adaptador solo activa fallback cuando el juicio declara VISUAL.
    deficit = getattr(validated, "deficit_type", None)
    if deficit not in {None, "VISUAL"} and not getattr(validated, "delta_fb", False):
        return validated

    run_fallback(
        session_id=current_id,
        pregunta=question,
        referencia_modalidad=referencia_modalidad,
        puerto_vision=puerto_vision,
        puerto_llm=core_module._get_provider(),
        db_path=db_path,
    )
    second = ask(
        question, session_id=current_id, db_path=db_path, memoria_grafo=memoria, memoria_neo4j=memoria_neo4j
    )
    if isinstance(second, ValidatedResponse):
        return second
    ht2 = load_ht(current_id, db_path)
    return fval(second, ht2, db_path) if ht2 else second
