# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os

import pytest

from khora_kernel.engine.fval import fval, get_verdict, split_claims
from khora_kernel.engine.history import Ht, HtEvidence, Response, save_ht


# Dummy provider para tests sin red
class ProveedorDummy:
    def __init__(self, respuestas: dict):
        self.respuestas = respuestas

    def generar(self, solicitud):
        claim = solicitud.prompt.split("Afirmación a evaluar:")[1].strip()

        # Encontrar coincidencia aproximada (naive) en las respuestas dummy
        respuesta = "UNSUPPORTED"
        for k, v in self.respuestas.items():
            if k in claim:
                respuesta = v
                break

        class MockResp:
            texto = respuesta
        return MockResp()

@pytest.fixture(autouse=True)
def inject_dummy_provider(monkeypatch):
    import importlib
    fval_module = importlib.import_module("khora_kernel.engine.fval")

    # Mapeo de claim a salida del LLM
    dummy_responses = {
        "El cielo es azul.": "SUPPORTED: n123",
        "La tierra es plana.": "UNSUPPORTED",
        "El sol quema.": "SUPPORTED: n456",
        "Duda razonable.": "UNSUPPORTED",
    }

    def mock_get_provider():
        return ProveedorDummy(dummy_responses)

    monkeypatch.setattr(fval_module, "get_judge_provider", mock_get_provider)

@pytest.fixture
def tmp_db(tmp_path):
    return str(tmp_path / "test_sessions.db")

def test_split_claims():
    text = "Hola, mundo. El cielo es azul. La tierra es plana! ¿Será verdad?  "
    claims = split_claims(text)
    assert "El cielo es azul." in claims
    assert "La tierra es plana!" in claims

def test_fval_positivo(tmp_db):
    ht = Ht(
        session_id="ses_pos",
        created_at="2024-01-01T00:00:00Z",
        evidence=[HtEvidence(node_id="n123", triple="cielo es azul", source_step=1)]
    )
    save_ht(ht, tmp_db)

    resp = Response(
        answer="El cielo es azul.",
        citations=["n123"],
        ht_ref="ses_pos"
    )

    vresp = fval(resp, ht, tmp_db)
    assert vresp.vt == "Suficiente"
    assert vresp.answer_marcado == "El cielo es azul."
    assert len(vresp.claims) == 1
    assert vresp.claims[0]["verdict"] == "SUPPORTED"
    assert "n123" in vresp.claims[0]["evidence_ids"]

def test_fval_negativo(tmp_db):
    ht = Ht(
        session_id="ses_neg",
        created_at="2024-01-01T00:00:00Z",
        evidence=[HtEvidence(node_id="n123", triple="cielo es azul", source_step=1)]
    )
    save_ht(ht, tmp_db)

    resp = Response(
        answer="La tierra es plana.",
        citations=[],
        ht_ref="ses_neg"
    )

    os.environ["KHORA_FVAL_MODE"] = "mark"
    vresp = fval(resp, ht, tmp_db)

    assert vresp.vt == "Insuficiente"
    assert "[NO VERIFICADO]" in vresp.answer_marcado
    assert vresp.claims[0]["verdict"] == "UNSUPPORTED"

def test_vt_en_ht(tmp_db):
    ht = Ht(
        session_id="ses_vt",
        created_at="2024-01-01T00:00:00Z",
        evidence=[]
    )
    save_ht(ht, tmp_db)

    resp = Response(
        answer="La tierra es plana.",
        citations=[],
        ht_ref="ses_vt"
    )

    fval(resp, ht, tmp_db)

    # Recuperar el veredicto
    vt = get_verdict("ses_vt", tmp_db)
    assert vt == "Insuficiente"

def test_sesgo_conservador(tmp_db):
    ht = Ht(
        session_id="ses_cons",
        created_at="2024-01-01T00:00:00Z",
        evidence=[]
    )
    save_ht(ht, tmp_db)

    resp = Response(
        answer="Esto es una duda razonable.", # Modificado para no ser filtrado por longitud
        citations=[],
        ht_ref="ses_cons"
    )

    vresp = fval(resp, ht, tmp_db)
    assert vresp.vt == "Insuficiente"
    assert len(vresp.claims) > 0
    assert vresp.claims[0]["verdict"] == "UNSUPPORTED"

def test_no_escritura_pkg(monkeypatch, tmp_path):
    """Prueba que no se toca el grafo. En un sistema con Mocks podemos verificar
       que no se llamó a la bd."""
    class FakeNeo4j:
        def __init__(self):
            self.writes = 0

    db = FakeNeo4j()

    resp = Response(
        answer="El cielo es azul.",
        citations=[],
        ht_ref="test_no_escritura"
    )
    ht = Ht(
        session_id="test_no_escritura",
        created_at="ts",
        evidence=[],
        steps=[],
        verdicts=[]
    )

    db_path = str(tmp_path / "test_no_escritura.db")
    fval(resp, ht, db_path)
    assert db.writes == 0
