# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from khora_kernel.api import SolicitudLLM
from khora_kernel.engine.history import Ht, HtEvidence, Response, load_ht, save_ht
from khora_kernel.proveedores.openai import ProveedorOpenAICompatible


@dataclass
class ValidatedResponse:
    answer_marcado: str
    claims: List[Dict[str, Any]]
    vt: str

def get_judge_provider():
    return ProveedorOpenAICompatible()

def split_claims(answer: str) -> List[str]:
    """D1: claim splitting via regex for sentences."""
    # Split on common punctuation that ends a sentence, followed by space and uppercase or end of string.
    # robust regex for sentences
    raw_claims = re.split(r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])', answer.strip())
    claims = []
    for c in raw_claims:
        c = c.strip()
        if not c:
            continue
        # Saludos/conectores heuristics
        if len(c.split()) < 3 and not any(char.isdigit() for char in c):
            continue
        claims.append(c)
    return claims

def _evaluar_juez(claim: str, evidence: List[HtEvidence]) -> Dict[str, Any]:
    """
    D2: juez LLM (env KHORA_JUDGE_MODEL)
    D3: modelo juez -> docs/model-stack.md
    """
    provider = get_judge_provider()

    evidence_text = "\n".join([f"[{e.node_id}] {e.triple}" for e in evidence if e.triple])
    if not evidence_text:
        evidence_text = "\n".join([f"[{e.node_id}] Content from DB" for e in evidence])

    system_prompt = (
        "Eres un juez estricto. Tu tarea es verificar si la afirmación (claim) está 100% respaldada "
        "por la evidencia proporcionada.\n"
        "Si está respaldada, responde EXACTAMENTE con 'SUPPORTED' seguido de los IDs de evidencia que la respaldan, en formato 'SUPPORTED: id1, id2'.\n"
        "Si NO está respaldada total y explícitamente, o si tienes la más mínima duda (sesgo conservador), "
        "responde EXACTAMENTE con 'UNSUPPORTED'."
    )

    if not os.path.exists("docs/model-stack.md"):
        system_prompt += "\nComo no hay docs/model-stack.md, incluye 'SUSTITUCIÓN NO VALIDADA'."

    solicitud = SolicitudLLM(
        prompt=f"Evidencia:\n{evidence_text}\n\nAfirmación a evaluar:\n{claim}",
        sistema=system_prompt,
        formato_estricto=None,
        metadata={"temperature": 0.0, "model": os.environ.get("KHORA_JUDGE_MODEL", "default")}
    )

    try:
        resp = provider.generar(solicitud)
        output = resp.texto.strip()
    except Exception:
        # Fallback for errors with conservative bias
        output = "UNSUPPORTED"
        if not os.path.exists("docs/model-stack.md"):
            output += " SUSTITUCIÓN NO VALIDADA"

    # Parse response
    if "SUPPORTED" in output and "UNSUPPORTED" not in output:
        # Extract evidence ids
        parts = output.split("SUPPORTED")
        ids_part = parts[1] if len(parts) > 1 else ""
        # rough extraction of ids
        evidence_ids = re.findall(r'[a-zA-Z0-9_\-]+', ids_part.replace(":", ""))
        # Clean out "SUSTITUCION NO VALIDADA" words if any
        evidence_ids = [eid for eid in evidence_ids if eid.lower() not in ["sustitución", "no", "validada", "sustitucion", "y", "o"]]
        return {"status": "SUPPORTED", "evidence_ids": evidence_ids}
    else:
        return {"status": "UNSUPPORTED"}

def fval(response: Response, ht: Ht, db_path: str = "data/khora_sessions.db") -> ValidatedResponse:
    claims = split_claims(response.answer)
    evaluated_claims = []

    all_supported = True
    answer_marcado = response.answer

    mode = os.environ.get("KHORA_FVAL_MODE", "mark")

    for c in claims:
        eval_result = _evaluar_juez(c, ht.evidence)
        status = eval_result.get("status")
        evidence_ids = eval_result.get("evidence_ids", [])

        is_supported = (status == "SUPPORTED")
        if not is_supported:
            all_supported = False

        evaluated_claims.append({
            "claim": c,
            "verdict": status,
            "evidence_ids": evidence_ids,
            "ts": datetime.utcnow().isoformat() + "Z"
        })

        # Modify the answer based on mode if UNSUPPORTED
        if not is_supported:
            if mode == "mark":
                answer_marcado = answer_marcado.replace(c, f"{c} [NO VERIFICADO]")
            elif mode == "strip":
                answer_marcado = answer_marcado.replace(c, "")

    # Clean up multiple spaces if stripped
    if mode == "strip":
        answer_marcado = re.sub(r'\s+', ' ', answer_marcado).strip()

    vt = "Suficiente" if (all_supported and len(claims) > 0) else "Insuficiente"

    # Update Ht.verdicts
    new_ht = Ht(
        session_id=ht.session_id,
        created_at=ht.created_at,
        steps=ht.steps,
        evidence=ht.evidence,
        verdicts=ht.verdicts + evaluated_claims
    )
    save_ht(new_ht, db_path)

    return ValidatedResponse(
        answer_marcado=answer_marcado,
        claims=evaluated_claims,
        vt=vt
    )

def get_verdict(session_id: str, db_path: str = "data/khora_sessions.db") -> Optional[str]:
    ht = load_ht(session_id, db_path)
    if not ht or not ht.verdicts:
        return None

    # Recalculate vt based on the saved verdicts for the session
    # The prompt says: "Suficiente si TODAS las claims sustantivas SUPPORTED; si no, Insuficiente."
    all_supported = all(v.get("verdict") == "SUPPORTED" for v in ht.verdicts)
    return "Suficiente" if (all_supported and len(ht.verdicts) > 0) else "Insuficiente"
