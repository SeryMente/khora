# @l0 L0-002-R · @req RAZ-02/REQ-2 · @acr ACR-2.1 · @ua UA-21,UA-22,UA-23,UA-24,UA-25,UA-41
import asyncio
from typing import Any

from khora_kernel.api import PuertoLLM, PuertoVision
from khora_kernel.engine.history import HtEvidence, load_ht, save_ht
from khora_kernel.tvis.corutina import refinar_visual


async def fallback(
    session_id: str,
    pregunta: str,
    referencia_modalidad: str,
    puerto_vision: PuertoVision,
    puerto_llm: PuertoLLM,
    db_path: str = "data/khora_sessions.db",
) -> dict[str, Any]:
    """ΔFB como co-rutina neural: recupera payload crudo y ejecuta tVIS.
    El resultado visual es efímero respecto al PKG; solo H_t de la sesión lo conserva."""
    ht = load_ht(session_id, db_path)
    if not ht:
        raise RuntimeError("No existe H_t para activar fallback")
    raw = puerto_vision.extraer_evidencia(referencia_modalidad)
    if not raw:
        raise RuntimeError("PuertoVision no devolvió payload crudo")
    relevant: list[str] = []
    for event in getattr(ht, "trace", []):
        if isinstance(event, dict):
            relevant.extend(event.get("gstar_nodes", []))
    relevant = list(dict.fromkeys(relevant))[:50]
    result = await refinar_visual(raw, relevant, puerto_llm, pregunta=pregunta)
    step_no = len(ht.steps) + 1
    evidence_text = result.hallazgo_vqa
    if not evidence_text.lower().startswith("evidencia visual"):
        evidence_text = "Evidencia Visual VQA: " + evidence_text
    evidence = HtEvidence(
        node_id="fallback_vqa",
        triple=evidence_text,
        source_step=step_no,
    )
    from khora_kernel.engine.core import _add_evidence, _add_step, _add_trace
    updated = _add_step(ht, "FALLBACK", "ΔFB activado por insuficiencia VISUAL.",
                        {"entities": result.entidades_consultadas, "bytes": result.bytes_procesados})
    updated = _add_evidence(updated, [evidence])
    updated = _add_trace(updated, {
        "action": "FALLBACK", "visual_ephemeral": True,
        "raw_payload_persisted_to_pkg": False,
        "entities_selected_topologically": relevant,
    })
    save_ht(updated, db_path)
    return {"hallazgo": result.hallazgo_vqa, "session_id": session_id, "entities": relevant}


def run_fallback(*args, **kwargs):
    """Adaptador síncrono para consumidores no async; el núcleo sigue siendo co-rutina."""
    try:
        return asyncio.run(fallback(*args, **kwargs))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(fallback(*args, **kwargs))
        finally:
            loop.close()
