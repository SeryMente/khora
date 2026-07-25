# @l0 L0-002 · @req RAZ-01/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua —
import json
import os
import pytest
from unittest import mock

from khora_kernel.api import PuertoLLM, RespuestaLLM, SolicitudLLM, Provenance
from khora_kernel.engine.core import ejecutar_ciclo, ask, Λ, Σ
from khora_kernel.engine.history import Ht, HtStep, HtEvidence, Response, load_ht, save_ht

class MockPuertoLLM(PuertoLLM):
    def __init__(self, forced_responses):
        self.forced_responses = forced_responses
        self.call_count = 0
        self.last_solicitud = None

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        self.last_solicitud = solicitud
        if self.call_count < len(self.forced_responses):
            resp = self.forced_responses[self.call_count]
        else:
            resp = json.dumps({"accion": "STOP", "justificacion": "No more mock responses"})
        self.call_count += 1
        return RespuestaLLM(
            texto=resp,
            modelo="mock",
            provenance=Provenance(origen="mock", driver="mock", timestamp="2026-07-23T12:00:00Z")
        )

# ACR-1.1: Ciclo completo -> ANSWER con Ht persistido en SQLite
def test_raz_01_acr_1_1_ciclo_completo(tmp_path, monkeypatch):
    # Temporarily override db path
    db_file = str(tmp_path / "khora_sessions.db")

    # We patch history's init_db/save_ht to use this db_file by default
    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    mock_llm = MockPuertoLLM([
        json.dumps({"accion": "RETRIEVE", "justificacion": "Buscando contexto"}),
        json.dumps({"accion": "ANSWER", "justificacion": "Tengo la respuesta"})
    ])

    session_id = "test_sess_1"

    response = ejecutar_ciclo(session_id, "Hola?", mock_llm, None)

    assert response.ht_ref == session_id
    assert mock_llm.call_count == 2

    # Verify persistence
    ht_loaded = mock_load_ht(session_id)
    assert ht_loaded is not None
    assert len(ht_loaded.steps) == 2
    assert ht_loaded.steps[0].state == "RETRIEVE"
    assert ht_loaded.steps[1].state == "ANSWER"


# ACR-1.2: πθ inválido → 1 reintento → STOP
def test_raz_01_acr_1_2_invalido_reintento_stop(tmp_path, monkeypatch):
    db_file = str(tmp_path / "khora_sessions.db")

    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    mock_llm = MockPuertoLLM([
        "invalid json",  # First failure
        '{"accion": "INVALID_ACT", "justificacion": "..."}' # Retry failure (invalid Enum)
    ])

    session_id = "test_sess_2"

    response = ejecutar_ciclo(session_id, "Hola?", mock_llm, None)

    # 1 intention + 1 retry = 2 calls to generating in the first step
    assert mock_llm.call_count == 2

    ht_loaded = mock_load_ht(session_id)
    assert ht_loaded is not None
    assert len(ht_loaded.steps) == 1
    assert ht_loaded.steps[0].state == "STOP"
    assert "Fallo al parsear JSON" in ht_loaded.steps[0].detail


# ACR-1.3: Ht de paso anterior leído en prompt del siguiente
def test_raz_01_acr_1_3_lectura_ht_prompt(tmp_path, monkeypatch):
    db_file = str(tmp_path / "khora_sessions.db")

    def mock_save_ht(ht, db_path=db_file):
        save_ht(ht, db_path=db_file)
    def mock_load_ht(session_id, db_path=db_file):
        return load_ht(session_id, db_path=db_file)

    monkeypatch.setattr("khora_kernel.engine.core.save_ht", mock_save_ht)
    monkeypatch.setattr("khora_kernel.engine.core.load_ht", mock_load_ht)

    mock_llm = MockPuertoLLM([
        json.dumps({"accion": "RETRIEVE", "justificacion": "Buscando contexto"}),
        json.dumps({"accion": "ANSWER", "justificacion": "Respuesta final"})
    ])

    session_id = "test_sess_3"

    ejecutar_ciclo(session_id, "Pregunta?", mock_llm, None)

    # The last prompt (for the 2nd step) should contain the history from step 1
    prompt_sent = mock_llm.last_solicitud.prompt
    assert "[Historial]" in prompt_sent
    assert "Paso 1: estado=RETRIEVE detalle=Buscando contexto" in prompt_sent
    assert "[Fin historial]" in prompt_sent
