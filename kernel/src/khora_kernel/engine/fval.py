# @l0 L0-002-R · @req RAZ-02/REQ-1,REQ-2 · @acr ACR-2.1 · @ua UA-20,UA-21,UA-41
import json
import os
from dataclasses import dataclass
from typing import Any

from khora_kernel.api import PuertoLLM, SolicitudLLM
from khora_kernel.engine.history import Response


@dataclass(frozen=True)
class FvalResult:
    vt: str
    deficit_type: str | None = None
    reason: str = ""
    scope: str = "global_Ht"
    answer_marcado: str | None = None
    claims: list[dict] | None = None

    @property
    def verdict(self) -> str:
        return self.vt


# Adapter legacy: algunos consumidores históricos importan esta forma.
ValidatedResponse = FvalResult


def split_claims(text: str) -> list[str]:
    import re
    return [c.strip() for c in re.split(r"(?<=[.!?])\s+", text.strip()) if c.strip()]


def get_judge_provider() -> PuertoLLM:
    from khora_kernel.proveedores.llm_generico import ProveedorLLMGenerico
    return ProveedorLLMGenerico()


def _clean_json(text: str) -> str:
    return text.strip().replace("```json", "").replace("```", "").strip()


def _global_fval(answer: str, ht: Any, puerto_llm: PuertoLLM, question: str | None = None) -> FvalResult:
    history = {
        "steps": [s.__dict__ for s in ht.steps],
        "evidence": [e.__dict__ for e in ht.evidence],
        "trace": list(getattr(ht, "trace", [])),
    }
    prompt = (
        "Evalúa si la respuesta está completamente respaldada por H_t. "
        "Evalúa GLOBALMENTE si H_t contiene evidencia suficiente para respaldar la respuesta. "
        "No hagas verificación claim-by-claim. VISUAL solo si la insuficiencia exige evidencia "
        "no textual/visual. Devuelve JSON.\n"
        f"QUESTION:\n{question or 'no proporcionada por el adaptador legado'}\nANSWER:\n{answer}\nH_t:\n{json.dumps(history, ensure_ascii=False)}\n"
        '{"vt":"Sufficient|Insufficient","deficit_type":"VISUAL|TEXTUAL|null","reason":"..."}'
    )
    req = SolicitudLLM(prompt, "Eres fVAL de EpisTwin. Juicio global sobre H_t.", None,
                       {"temperature": 0.0, "role": "fVAL"})
    last_error = "respuesta inválida"
    for _ in range(2):
        response = puerto_llm.generar(req)
        try:
            data = json.loads(_clean_json(response.texto))
            vt = str(data.get("vt") or data.get("verdict") or "").lower()
            deficit = data.get("deficit_type")
            reason = str(data.get("reason") or "")
            if vt in {"sufficient", "suficiente"}:
                return FvalResult("Sufficient", None, reason or "Sufficient")
            if vt in {"insufficient", "insuficiente"}:
                deficit = str(deficit).upper() if deficit else "TEXTUAL"
                if deficit not in {"VISUAL", "TEXTUAL"}:
                    deficit = "TEXTUAL"
                return FvalResult("Insufficient", deficit, reason or "Insufficient")
            last_error = f"vt inválido: {vt}"
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            last_error = str(exc)
    return FvalResult("Insufficient", "TEXTUAL", f"fVAL no pudo validar JSON: {last_error}")


def _legacy_fval(resp: Response, ht: Any, db_path: str) -> FvalResult:
    claims = split_claims(resp.answer)
    provider = get_judge_provider()
    evidence_ids = {e.node_id for e in ht.evidence}
    claim_results = []
    all_supported = True
    for claim in claims:
        prompt = f"Afirmación a evaluar:\n{claim}"
        out = provider.generar(SolicitudLLM(prompt, "Legacy judge.", None, {"temperature": 0.0, "role": "legacy_fVAL"})).texto.strip()
        supported = out.upper().startswith("SUPPORTED") and any(x in out for x in evidence_ids)
        claim_results.append({
            "claim": claim,
            "verdict": "SUPPORTED" if supported else "UNSUPPORTED",
            "evidence_ids": sorted(evidence_ids) if supported else [],
        })
        all_supported = all_supported and supported
    vt = "Suficiente" if all_supported and claims else "Insuficiente"
    marked = resp.answer if vt == "Suficiente" else " ".join(
        c["claim"] if c["verdict"] == "SUPPORTED" else c["claim"] + " [NO VERIFICADO]"
        for c in claim_results
    )
    result = FvalResult(vt, None if vt == "Suficiente" else "TEXTUAL",
                        "legacy compatibility", "legacy_claim_adapter", marked, claim_results)
    from khora_kernel.engine.history import Ht, save_ht
    verdicts = list(ht.verdicts) + [{"vt": vt, "scope": "legacy"}]
    updated_ht = Ht(
        session_id=ht.session_id,
        created_at=ht.created_at,
        steps=ht.steps,
        evidence=ht.evidence,
        verdicts=verdicts,
        trace=list(getattr(ht, "trace", [])),
    )
    save_ht(updated_ht, db_path)
    return result


def fval(answer: Any, ht: Any, puerto_llm_or_db: Any, *, question: str | None = None) -> FvalResult:
    if isinstance(answer, Response) and isinstance(puerto_llm_or_db, str):
        return _legacy_fval(answer, ht, puerto_llm_or_db)
    return _global_fval(str(answer), ht, puerto_llm_or_db, question=question)


def get_verdict(answer_or_session: str, context_or_db: Any) -> Any:
    if isinstance(context_or_db, str) and len(answer_or_session) > 0 and os.path.exists(context_or_db):
        from khora_kernel.engine.history import load_ht
        ht = load_ht(answer_or_session, context_or_db)
        if not ht or not ht.verdicts:
            return None
        return ht.verdicts[-1].get("vt")
    if isinstance(context_or_db, list):
        class _Ht:
            steps = []
            evidence = []
            trace = context_or_db
        result = _global_fval(answer_or_session, _Ht(), get_judge_provider())
        return {"verdict": result.vt, "deficit_type": result.deficit_type, "reason": result.reason}
    return None
