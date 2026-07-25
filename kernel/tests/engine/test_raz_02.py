# @l0 L0-002 · @req RAZ-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua —
import json

from khora_kernel.api import Provenance, PuertoLLM, RespuestaLLM, SolicitudLLM
from khora_kernel.engine.core import ValidatedResponse, ejecutar_ciclo
from khora_kernel.engine.history import load_ht, save_ht


class MockPuertoLLM(PuertoLLM):
    def __init__(self, action_responses, forced_verdict):
        """
        action_responses: Lista de respuestas para el ciclo principal de acciones.
        forced_verdict: Respuesta que debe dar fVAL al llamar get_verdict().
        """
        self.action_responses = action_responses
        self.forced_verdict = forced_verdict
        self.call_count = 0

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        # Check if it's an fVAL prompt
        if "Evalúa si la respuesta está completamente respaldada" in (solicitud.prompt or ""):
            texto_resp = self.forced_verdict or ""
        else:
            if self.call_count < len(self.action_responses):
                texto_resp = self.action_responses[self.call_count]
                self.call_count += 1
            else:
                texto_resp = json.dumps({"accion": "STOP", "justificacion": "No more mock responses"})

        return RespuestaLLM(
            texto=texto_resp,
            modelo="mock",
            provenance=Provenance(origen="mock", driver="mock", timestamp="2026-07-23T12:00:00Z")
        )

# Prueba 1: SUFFICIENT -> sin ΔFB
def test_raz_02_sufficient_sin_dfb(tmp_path, monkeypatch):
    db_file = str(tmp_path / "khora_sessions.db")

    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    mock_llm = MockPuertoLLM(
        action_responses=[json.dumps({"accion": "ANSWER", "justificacion": "Respuesta buena"})],
        forced_verdict=json.dumps({"verdict": "SUFFICIENT", "deficit_type": None, "reason": "Ok"})
    )

    session_id = "test_sess_suff"
    val_resp = ejecutar_ciclo(session_id, "Pregunta?", mock_llm, None)

    assert isinstance(val_resp, ValidatedResponse)
    assert val_resp.verdict == "SUFFICIENT"
    assert val_resp.delta_fb is False
    assert val_resp.derived_from == "RAZ-02/fVAL"
    # El loop rompe en el primer step de ANSWER si es suficiente
    ht_loaded = mock_load_ht(session_id)
    assert ht_loaded is not None
    assert len(ht_loaded.steps) == 1


# Prueba 2: INSUFFICIENT+TEXTUAL -> sin ΔFB y continua el loop
def test_raz_02_insufficient_textual_continua_loop(tmp_path, monkeypatch):
    db_file = str(tmp_path / "khora_sessions.db")

    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    # 1. Primer answer es INSUFFICIENT+TEXTUAL -> core no rompe el loop (paso actual suma 1)
    # 2. Segundo answer es SUFFICIENT -> core rompe el loop
    mock_llm = MockPuertoLLM(
        action_responses=[
            json.dumps({"accion": "ANSWER", "justificacion": "Falta info textual"}),
            json.dumps({"accion": "ANSWER", "justificacion": "Ya tengo la info textual"})
        ],
        forced_verdict=None # Manejado de forma manual abajo para simular cambios
    )

    # Modificar el mock generar para responder diferente cada vez que se llame fVAL
    def custom_fval_generar(solicitud: SolicitudLLM) -> RespuestaLLM:
        if "Evalúa si la respuesta está completamente respaldada" in (solicitud.prompt or ""):
            if not hasattr(custom_fval_generar, "_fval_calls"):
                setattr(custom_fval_generar, "_fval_calls", 0)

            fval_calls = getattr(custom_fval_generar, "_fval_calls")
            if fval_calls == 0:
                texto_resp = json.dumps({"verdict": "INSUFFICIENT", "deficit_type": "TEXTUAL", "reason": "Malo"})
            else:
                texto_resp = json.dumps({"verdict": "SUFFICIENT", "deficit_type": None, "reason": "Bueno"})
            setattr(custom_fval_generar, "_fval_calls", fval_calls + 1)
            return RespuestaLLM(texto=texto_resp, modelo="mock", provenance=Provenance(origen="mock", driver="mock", timestamp="2026-07-23T12:00:00Z"))

        # Original call para los actions
        if mock_llm.call_count < len(mock_llm.action_responses):
            texto_resp = mock_llm.action_responses[mock_llm.call_count]
            mock_llm.call_count += 1
        else:
            texto_resp = json.dumps({"accion": "STOP", "justificacion": "No more mock responses"})

        return RespuestaLLM(
            texto=texto_resp,
            modelo="mock",
            provenance=Provenance(origen="mock", driver="mock", timestamp="2026-07-23T12:00:00Z")
        )

    monkeypatch.setattr(mock_llm, "generar", custom_fval_generar)

    session_id = "test_sess_insuff_txt"
    val_resp = ejecutar_ciclo(session_id, "Pregunta?", mock_llm, None)

    assert isinstance(val_resp, ValidatedResponse)
    assert val_resp.verdict == "SUFFICIENT" # Al final se hizo suficiente
    assert val_resp.delta_fb is False

    # Asegurar que se iteró el loop y hubo múltiples pasos guardados
    ht_loaded = mock_load_ht(session_id)
    assert ht_loaded is not None
    assert len(ht_loaded.steps) == 2


# Prueba 3: INSUFFICIENT+VISUAL -> con ΔFB
def test_raz_02_insufficient_visual_dfb_true(tmp_path, monkeypatch):
    db_file = str(tmp_path / "khora_sessions.db")

    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    mock_llm = MockPuertoLLM(
        action_responses=[json.dumps({"accion": "ANSWER", "justificacion": "Falta imagen"})],
        forced_verdict=json.dumps({"verdict": "INSUFFICIENT", "deficit_type": "VISUAL", "reason": "No veo la imagen"})
    )

    session_id = "test_sess_insuff_vis"
    val_resp = ejecutar_ciclo(session_id, "Pregunta imagen?", mock_llm, None)

    assert isinstance(val_resp, ValidatedResponse)
    assert val_resp.verdict == "INSUFFICIENT"
    assert val_resp.deficit_type == "VISUAL"
    assert val_resp.delta_fb is True

    # El loop rompió tras el primer intento, pues fue visual.
    ht_loaded = mock_load_ht(session_id)
    assert ht_loaded is not None
    assert len(ht_loaded.steps) == 1
