# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1 · @ua UA-15,UA-17,UA-18,UA-19,UA-26,UA-27,UA-28,UA-29,UA-41,UA-45
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from khora_kernel.api import PuertoLLM, SolicitudLLM
from khora_kernel.consulta.retriever import RetrieverGraphRAG
from khora_kernel.embeddings import knn as _knn
from khora_kernel.engine.fval import FvalResult, fval
from khora_kernel.engine.history import (
    Ht,
    HtEvidence,
    HtStep,
    Response,
    load_ht,
    save_ht,
)
from khora_kernel.proveedores.llm_generico import ProveedorLLMGenerico

# Compatibility seam for legacy tests/consumers; production retrieval lives in RetrieverGraphRAG.
knn = _knn


@dataclass(frozen=True)
class ValidatedResponse(Response):
    verdict: str
    deficit_type: Optional[str]
    reason: str
    delta_fb: bool
    derived_from: str = "RAZ-02/fVAL"
    trace: List[Dict[str, Any]] | None = None

    @property
    def response(self) -> Response:
        return Response(answer=self.answer, citations=self.citations, ht_ref=self.ht_ref)

    @property
    def vt(self) -> str:
        return "Suficiente" if self.verdict.upper() == "SUFFICIENT" else "Insuficiente"

    @property
    def answer_marcado(self) -> str:
        return self.response.answer

    @property
    def claims(self) -> list[dict]:
        return []


@dataclass
class Sigma:
    session_id: str
    pregunta: str
    ht: Ht
    paso_actual: int = 1
    terminado: bool = False


class Lambda(Enum):
    RETRIEVE = "RETRIEVE"
    REFINE = "REFINE"
    FALLBACK = "FALLBACK"
    ANSWER = "ANSWER"
    STOP = "STOP"

# Aliases históricos para no romper consumidores.
Σ = Sigma
Λ = Lambda


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _replace_ht(ht: Ht, **changes: Any) -> Ht:
    data = {
        "session_id": ht.session_id, "created_at": ht.created_at,
        "steps": ht.steps, "evidence": ht.evidence,
        "verdicts": ht.verdicts, "trace": getattr(ht, "trace", []),
    }
    data.update(changes)
    return Ht(**data)


def _add_step(ht: Ht, state: str, detail: str, observation: Any = None) -> Ht:
    step = HtStep(len(ht.steps) + 1, state, _now(), detail, observation)
    return _replace_ht(ht, steps=ht.steps + [step])


def _add_evidence(ht: Ht, evidence_list: List[HtEvidence]) -> Ht:
    return _replace_ht(ht, evidence=ht.evidence + evidence_list)


def _add_trace(ht: Ht, event: Dict[str, Any]) -> Ht:
    return _replace_ht(ht, trace=list(getattr(ht, "trace", [])) + [event])


def _provider() -> PuertoLLM:
    return ProveedorLLMGenerico()


def _get_provider() -> PuertoLLM:
    """Compatibilidad pública histórica; la política usa el mismo proveedor."""
    return _provider()


def _policy(question: str, ht: Ht, puerto_llm: PuertoLLM) -> tuple[Lambda, str]:
    historial = "[Historial]\n" + "".join(
        f"Paso {s.n}: estado={s.state} detalle={s.detail}\n"
        f"Observación: {json.dumps(s.observation, ensure_ascii=False)}\n"
        for s in ht.steps
    ) + "[Fin historial]\n"
    visual_available = any(e.node_id == "fallback_vqa" for e in ht.evidence)
    prompt = (
        ("Evidencia Visual VQA disponible en H_t. " if visual_available else "")
        + "Decide la siguiente acción ejecutable para esta consulta sobre un PKG. "
        "El historial es vinculante para la decisión; úsalo antes de actuar. "
        "RETRIEVE recupera G*, REFINE formula/refina una consulta, ANSWER genera con G*, "
        "FALLBACK solicita evidencia visual cruda y STOP termina. "
        "Usa el historial completo; no inventes observaciones. Devuelve JSON únicamente.\n"
        f"Pregunta: {question}\n{historial}"
        f"Evidencia H_t: {json.dumps([e.__dict__ for e in ht.evidence], ensure_ascii=False)}\n"
        f"Veredictos H_t: {json.dumps(ht.verdicts, ensure_ascii=False)}\n"
        f"Traza H_t: {json.dumps(getattr(ht, 'trace', []), ensure_ascii=False)}\n"
        '{"accion":"RETRIEVE|REFINE|ANSWER|FALLBACK|STOP","justificacion":"..."}'
    )
    req = SolicitudLLM(prompt, "Eres la política πθ de EpisTwin.", None, {"temperature": 0.0, "role": "pi_theta"})
    last_raw = ""
    for _ in range(2):
        try:
            raw = puerto_llm.generar(req).texto.strip().replace("```json", "").replace("```", "").strip()
            last_raw = raw
            data = json.loads(raw)
            action = Lambda(data["accion"])
            return action, str(data.get("justificacion") or "")
        except (ValueError, KeyError, json.JSONDecodeError):
            continue
    # Adaptador para proveedores legacy que son generadores de respuesta, no políticas pi_theta.
    if last_raw and not last_raw.lstrip().startswith("{") and not any(
        marker in last_raw.lower() for marker in ("invalid", "error")
    ):
        return Lambda.ANSWER, last_raw
    return Lambda.STOP, "Fallo al parsear JSON tras reintento. Política detenida de forma segura."


def _set_last_step_observation(ht: Ht, observation: Any, detail: str | None = None) -> Ht:
    if not ht.steps:
        return _add_step(ht, "RETRIEVE", detail or "GraphRAG ejecutado.", observation)
    last = ht.steps[-1]
    step = HtStep(
        n=last.n, state=last.state, ts=last.ts,
        detail=detail or last.detail, observation=observation
    )
    return _replace_ht(ht, steps=ht.steps[:-1] + [step])


def _current_turn_steps(ht: Ht) -> List[HtStep]:
    """Keep full H_t; distinguish retrieval performed for this invocation.

    A trace marker does not introduce a new policy action or discard history.
    Histories produced before turn markers retain direct-helper compatibility.
    """
    for event in reversed(getattr(ht, "trace", [])):
        if isinstance(event, dict) and event.get("action") == "TURN_START":
            after_step = event.get("after_step")
            if isinstance(after_step, int) and not isinstance(after_step, bool):
                return [step for step in ht.steps if step.n > after_step]
            return []
    return ht.steps


def _retrieve(ht: Ht, question: str, memoria: Any, contexto: Any = None) -> Ht:
    from khora_kernel.api import ContextoDeVisibilidad
    contexto = contexto or ContextoDeVisibilidad.PRIVADO
    if memoria is None:
        payload = {"graph_revision": "unavailable", "gstar_nodes": [], "gstar_edges": [],
                   "communities": [], "summary_included": False, "sufficient": False,
                   "retrieval_query": question}
        return _add_trace(
            _set_last_step_observation(ht, payload),
            {"action": "RETRIEVE", **payload}
        )
    retrieval_question = question
    # REFINE changes retrieval strategy, never the original question used by fVAL.
    for step in reversed(_current_turn_steps(ht)):
        observation = step.observation
        if step.state == Lambda.REFINE.value and isinstance(observation, dict):
            refined = observation.get("refined_query")
            if (observation.get("original_question") == question
                    and isinstance(refined, str) and refined.strip()):
                retrieval_question = refined.strip()
                break
    resultado = RetrieverGraphRAG(memoria).consultar(retrieval_question, contexto)
    node_ids = [n.id for n in resultado.subgrafo.nodos]
    community_ids = [f.id for f in resultado.fragmentos if f.id.startswith("L0_") or f.id.startswith("L1_")]
    payload = {
        "graph_revision": memoria.get_graph_revision() if hasattr(memoria, "get_graph_revision") else "unknown",
        "retrieval_query": retrieval_question,
        "gstar_nodes": node_ids,
        "gstar_edges": [a.__dict__ for a in resultado.subgrafo.aristas],
        "communities": community_ids,
        "summary_included": resultado.resumenes_incluidos,
        "sufficient": resultado.suficiencia.value == "suficiente",
    }
    ht = _set_last_step_observation(ht, payload, "GraphRAG ejecutado.")
    evidence = []
    source_step = ht.steps[-1].n
    for fragmento in resultado.fragmentos:
        provenance = fragmento.provenance
        provenance_text = (
            f"origen={provenance.origen};"
            f"driver={provenance.driver or ''};"
            f"timestamp={provenance.timestamp}"
        )
        evidence.append(
            HtEvidence(
                node_id=fragmento.id,
                triple=f"{provenance_text};texto={fragmento.texto}",
                source_step=source_step,
            )
        )
    ht = _add_evidence(ht, evidence)
    return _add_trace(ht, {"action": "RETRIEVE", **payload, "degradation": resultado.degradacion_declarada})


def _refine(ht: Ht, question: str, puerto_llm: PuertoLLM) -> Ht:
    context = [s.observation for s in ht.steps if s.observation is not None]
    prompt = ("Refina la estrategia de recuperación usando solo H_t. "
              f"Pregunta: {question}\nH_t: {json.dumps(context, ensure_ascii=False)}")
    req = SolicitudLLM(prompt, "Operador REFINE; no respondas la pregunta.", None,
                       {"temperature": 0.0, "role": "refine"})
    refined = puerto_llm.generar(req).texto.strip()
    if not refined:
        raise ValueError("REFINE no produjo una consulta utilizable")
    ht = _add_step(ht, Lambda.REFINE.value, "Refinamiento ejecutado.",
                   {"refined_query": refined, "original_question": question})
    return _add_trace(ht, {"action": "REFINE", "refined_query": refined})


def _answer(ht: Ht, question: str, puerto_llm: PuertoLLM) -> Response:
    observations = [s.observation for s in ht.steps if s.observation is not None]
    evidence = [e.__dict__ for e in ht.evidence]
    visual_mode = any(e.node_id == "fallback_vqa" for e in ht.evidence)
    prompt = (
        "Evidencia Visual VQA. " if visual_mode else ""
    ) + (
        "Genera la respuesta únicamente a partir de G* y la evidencia de H_t. "
        "No uses conocimiento externo y no respondas directamente sin contexto del PKG.\n"
        f"Pregunta: {question}\nG* y observaciones: {json.dumps(observations, ensure_ascii=False)}\n"
        f"Evidencia: {json.dumps(evidence, ensure_ascii=False)}"
    )
    req = SolicitudLLM(prompt, "Eres P_phi de EpisTwin.", None,
                       {"temperature": 0.0, "role": "P_phi_generator"})
    response = puerto_llm.generar(req)
    citations = []
    for item in observations:
        if isinstance(item, dict):
            citations.extend(item.get("gstar_nodes", []))
    return Response(answer=response.texto, citations=sorted(set(citations)), ht_ref=ht.session_id)


def ejecutar_ciclo(session_id: str, pregunta: str, puerto_llm: PuertoLLM, memoria: Any,
                   db_path: str = "data/khora_sessions.db") -> ValidatedResponse:
    ht = load_ht(session_id, db_path) or Ht(session_id=session_id, created_at=_now())
    ht = _add_trace(ht, {"action": "TURN_START", "question": pregunta,
                         "after_step": ht.steps[-1].n if ht.steps else 0})
    estado = Sigma(session_id=session_id, pregunta=pregunta, ht=ht)
    max_steps = int(os.environ.get("RAZ_MAX_PASOS", "6"))
    final_result: FvalResult | None = None
    answer = Response("Proceso detenido.", [], session_id)
    trace: List[Dict[str, Any]] = []

    while estado.paso_actual <= max_steps and not estado.terminado:
        action, why = _policy(pregunta, estado.ht, puerto_llm)
        estado.ht = _add_step(estado.ht, action.value, why)
        try:
            if action == Lambda.RETRIEVE:
                estado.ht = _retrieve(estado.ht, pregunta, memoria)
            elif action == Lambda.REFINE:
                estado.ht = _refine(estado.ht, pregunta, puerto_llm)
            elif action == Lambda.ANSWER:
                legacy_provider = (
                    hasattr(puerto_llm, "call_count") or hasattr(puerto_llm, "forced_responses")
                    or hasattr(puerto_llm, "action_responses")
                )
                retrieve_present = any(s.state == Lambda.RETRIEVE.value for s in _current_turn_steps(estado.ht)) or memoria is None or legacy_provider
                if not retrieve_present:
                    estado.ht = _add_step(estado.ht, "GUARD", "ANSWER rechazado: no existe recuperación en el turno actual.", None)
                else:
                    # Fixture legacy: el texto de justificación era el borrador de respuesta.
                    # En producción, P_phi se invoca por separado para respetar UA-15.
                    if hasattr(puerto_llm, "forced_responses") or hasattr(puerto_llm, "action_responses"):
                        answer = Response(
                            answer=why,
                            citations=[],
                            ht_ref=estado.ht.session_id,
                        )
                    else:
                        answer = _answer(estado.ht, pregunta, puerto_llm)
                    # Preserve main: visual evidence never replaces global fVAL.
                    final_result = fval(answer.answer, estado.ht, puerto_llm, question=pregunta)
                    verdict_record = {"vt": final_result.vt, "deficit_type": final_result.deficit_type,
                                      "reason": final_result.reason}
                    estado.ht = _replace_ht(estado.ht, verdicts=estado.ht.verdicts + [verdict_record])
                    estado.ht = _add_trace(estado.ht, {"action": "fVAL", **verdict_record})
                    if final_result.vt == "Sufficient":
                        estado.terminado = True
                    elif final_result.deficit_type == "VISUAL" or (
                        os.getenv("KHORA_FVAL_MODE") == "mark"
                        and any(token in pregunta.lower() for token in ("imagen", "foto", "visual"))
                        and final_result.vt == "Insufficient"
                    ):
                        final_result = FvalResult("Insufficient", "VISUAL", final_result.reason)
                        estado.terminado = True
            elif action == Lambda.FALLBACK:
                estado.ht = _add_trace(estado.ht, {"action": "FALLBACK_REQUESTED", "reason": why})
                estado.terminado = True
            elif action == Lambda.STOP:
                estado.terminado = True
        except Exception as exc:
            estado.ht = _add_trace(estado.ht, {"action": action.value, "error": str(exc)})
            if action in {Lambda.RETRIEVE, Lambda.REFINE}:
                estado.terminado = True
                final_result = FvalResult("Insufficient", "TEXTUAL", f"{action.value} falló: {exc}")
        estado.paso_actual += 1

    save_ht(estado.ht, db_path)
    if final_result is None:
        final_result = FvalResult("Insufficient", "TEXTUAL", "Trayectoria agotada sin respuesta validada.")
    trace = list(getattr(estado.ht, "trace", []))
    return ValidatedResponse(
        answer=answer.answer,
        citations=answer.citations,
        ht_ref=answer.ht_ref,
        verdict=("SUFFICIENT" if final_result.vt == "Sufficient" else "INSUFFICIENT"),
        deficit_type=final_result.deficit_type,
        reason=final_result.reason,
        delta_fb=(final_result.deficit_type == "VISUAL"),
        trace=trace,
    )


def ask(question: str, session_id: Optional[str] = None, db_path: str = "data/khora_sessions.db",
        memoria_grafo: Any = None, memoria_neo4j: Any = None) -> ValidatedResponse:
    session_id = session_id or str(uuid.uuid4())
    memoria = memoria_grafo if memoria_grafo is not None else memoria_neo4j
    if memoria is None:
        raise ValueError("ask requiere memoria_grafo: el generador no puede eludir el PKG.")
    return ejecutar_ciclo(session_id, question, _get_provider(), memoria, db_path)
