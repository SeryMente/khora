# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
# @l0 L0-002 · @req RAZ-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua —
import json
from typing import Any, Dict, List

from khora_kernel.api import PuertoLLM, SolicitudLLM


def get_verdict(respuesta: str, contexto: List[Dict[str, Any]], puerto_llm: PuertoLLM) -> Dict[str, Any]:
    prompt = (
        f"Contexto:\n{json.dumps(contexto, indent=2, ensure_ascii=False)}\n\n"
        f"Respuesta a evaluar:\n{respuesta}\n\n"
        "Evalúa si la respuesta está completamente respaldada por el contexto (SUFFICIENT) "
        "o si es INSUFFICIENT. Si es INSUFFICIENT, especifica si el déficit es TEXTUAL o VISUAL.\n"
        "Responde ESTRICTAMENTE con un JSON con el siguiente formato:\n"
        '{"verdict": "SUFFICIENT" | "INSUFFICIENT", "deficit_type": "VISUAL" | "TEXTUAL" | null, "reason": "<string>"}'
    )

    solicitud = SolicitudLLM(
        prompt=prompt,
        sistema="Eres un evaluador estricto de suficiencia de respuestas. Debes responder solo con JSON válido.",
        formato_estricto=None,
        metadata={"temperature": 0.0}
    )

    last_error = None
    for _ in range(2):
        # Allow exceptions from LLM (network, auth) to bubble up (NUNCA silencioso)
        resp = puerto_llm.generar(solicitud)

        texto = resp.texto.strip()
        # Clean markdown formatting if present
        if texto.startswith("```json"):
            texto = texto[7:]
        elif texto.startswith("```"):
            texto = texto[3:]
        if texto.endswith("```"):
            texto = texto[:-3]
        texto = texto.strip()

        try:
            parsed = json.loads(texto)
            verdict = parsed.get("verdict")
            deficit_type = parsed.get("deficit_type")
            reason = parsed.get("reason")

            if verdict not in ("SUFFICIENT", "INSUFFICIENT"):
                raise ValueError(f"Veredicto inválido: {verdict}")

            return {
                "verdict": verdict,
                "deficit_type": deficit_type,
                "reason": reason if reason else "Sin razón especificada"
            }
        except (json.JSONDecodeError, ValueError) as e:
            last_error = str(e)
            # Reintentar si es el primer intento
            continue

    # Fallback tras reintento fallido (NUNCA silencioso)
    return {
        "verdict": "INSUFFICIENT",
        "deficit_type": "TEXTUAL",
        "reason": f"Fallo al parsear JSON tras reintento: {last_error}"
    }
