# @l0 L0-002-R · @req ING-05/REQ-1 · @acr ACR-05.1
import os

import pytest

import khora_kernel.summaries.fsum as fsum_module
from khora_kernel.api import PuertoLLM, SolicitudLLM


# MOCK DE RESPUESTA LLM
class MockPuertoLLM(PuertoLLM):
    def invocar(self, sol: SolicitudLLM) -> str:
        return f"Resumen sintético simulado. Longitud original: {len(sol.prompt)} chars."

# Parcheamos fsum.py para inyectar nuestro mock si no hay variables de entorno LLM


def test_generacion_sin_nodos_falla():
    """ACR-05.1 - Falla si no se envían nodos válidos."""
    # Para evitar acoplamiento de red en tests, inyectamos el puerto temporalmente en runtime
    fsum_module._puerto_llm_cache = MockPuertoLLM()

    with pytest.raises(ValueError, match="no contiene entidades"):
        fsum_module.generar_resumen_comunidad([], "Contexto mock")


def test_generacion_correcta_mock():
    """ACR-05.1 - Generación correcta con mock de LLM."""
    fsum_module._puerto_llm_cache = MockPuertoLLM()

    nodos = [{"id": "n1", "texto": "Un nodo"}, {"id": "n2", "texto": "Otro nodo"}]
    ctx = "Contexto mock"
    res = fsum_module.generar_resumen_comunidad(nodos, ctx)

    assert "Resumen sintético simulado" in res


def test_generacion_real_con_conexion():
    """ACR-05.1 - Ejecuta contra LLM real si KHORA_LLM_API_KEY está presente."""
    api_key = os.environ.get("KHORA_LLM_API_KEY")
    if not api_key:
        pytest.skip("KHORA_LLM_API_KEY no definida, se salta test de integración LLM.")

    nodos = [
        {"id": "Persona_A", "texto": "A es un desarrollador"},
        {"id": "Tecnologia_B", "texto": "A utiliza B en su día a día"}
    ]
    res = fsum_module.generar_resumen_comunidad(nodos, "Son entidades de un equipo de software")

    assert len(res) > 10
    assert "desarrollador" in res.lower() or "equipo" in res.lower()

