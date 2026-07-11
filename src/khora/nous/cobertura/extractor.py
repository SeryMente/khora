import re
import os
import json
import urllib.request
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Cobertura(BaseModel):
    inicio: Optional[str] = None
    fin: Optional[str] = None
    horas_cubiertas: Optional[float] = None
    evidencia: str = "Insuficiente"
    confianza: str = "Baja"
    nivel_evidencia: Optional[str] = None

def _extract_via_regex(texto: str) -> Cobertura:
    pattern = re.compile(
        r'(?:de\s+)?(\d{1,2}:\d{2})\s*(?:a|-)\s*(\d{1,2}:\d{2})',
        re.IGNORECASE
    )
    match = pattern.search(texto)
    if match:
        inicio_str, fin_str = match.groups()
        try:
            t_inicio = datetime.strptime(inicio_str, "%H:%M")
            t_fin = datetime.strptime(fin_str, "%H:%M")
            delta = t_fin - t_inicio
            horas = delta.total_seconds() / 3600.0
            if horas < 0:
                horas += 24.0
            return Cobertura(
                inicio=inicio_str, fin=fin_str,
                horas_cubiertas=round(horas, 2),
                evidencia=match.group(0), confianza="Alta",
                nivel_evidencia="E1"
            )
        except ValueError:
            pass
    return Cobertura()

def extraer_cobertura(texto: str) -> Cobertura:
    """
    Extrae la cobertura de horas de un texto (Bitácora).
    Usa la API de OpenAI si las credenciales están presentes,
    con fallback a regex determinista.
    Regla anti-RUVA: no inventa horas.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _extract_via_regex(texto)

    prompt = f"""
    Eres el módulo de cobertura narrativa (Ichnos). Analiza la siguiente entrada de bitácora.
    Tu objetivo es extraer: 'inicio' (HH:MM), 'fin' (HH:MM), 'horas_cubiertas' (float), 'evidencia' (el fragmento de texto exacto), 'confianza' (Alta/Media/Baja) y 'nivel_evidencia' (E1-E6).

    Regla anti-RUVA estricta: Si el texto NO tiene una declaración clara y explícita de horas de trabajo, DEBES devolver horas_cubiertas=null, evidencia="Insuficiente" y confianza="Baja". NO INVENTES horas.

    Niveles de Evidencia (E1-E6):
    E1: Tiempos explícitos exactos ("de 09:00 a 13:00").
    E2: Tiempos explícitos relativos muy claros ("trabajé 4 horas esta mañana", inicio/fin pueden ser null, pero horas_cubiertas=4.0).
    E3 a E6: Casos menos claros o deducibles pero no suficientes para 'horas_cubiertas'. En estos casos, horas_cubiertas debe ser null, y evidencia="Insuficiente".

    Devuelve estrictamente un JSON con las claves: "inicio", "fin", "horas_cubiertas", "evidencia", "confianza", "nivel_evidencia".

    Texto a analizar:
    "{texto}"
    """

    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10.0) as response:
            data = json.loads(response.read().decode("utf-8"))

        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        # Validar regla anti-RUVA: si horas es nulo, forzamos evidencia insuficiente
        if parsed.get("horas_cubiertas") is None:
            return Cobertura()

        return Cobertura(
            inicio=parsed.get("inicio"),
            fin=parsed.get("fin"),
            horas_cubiertas=parsed.get("horas_cubiertas"),
            evidencia=parsed.get("evidencia", "Insuficiente"),
            confianza=parsed.get("confianza", "Baja"),
            nivel_evidencia=parsed.get("nivel_evidencia")
        )
    except Exception:
        # Fallback a regex si falla la API
        return _extract_via_regex(texto)
