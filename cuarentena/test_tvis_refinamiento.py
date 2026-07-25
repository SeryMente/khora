# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import pytest
import sqlite3
import uuid
from khora_kernel.api import PuertoVision, Provenance
from khora_kernel.engine.orchestrator import ask_with_fallback
from khora_kernel.engine.history import load_ht
from unittest.mock import MagicMock, patch

# Mock PuertoVision
class MockPuertoVision(PuertoVision):
    def extraer_evidencia(self, referencia: str) -> str:
        return "base64_encoded_image_mock_data"

# Mock Neo4j Memory
class MockMemoriaNeo4j:
    def __init__(self):
        self.writes = 0
        self._driver = MagicMock()
        # Ensure we can track if anything tries to write
        self._driver.session.return_value.__enter__.return_value.run.side_effect = self._track_run

    def _track_run(self, query, parameters=None, **kwargs):
        if any(keyword in query.upper() for keyword in ["CREATE", "MERGE", "SET", "DELETE", "REMOVE"]):
            self.writes += 1
        return MagicMock()

@pytest.fixture
def temp_db(tmp_path):
    db_path = tmp_path / "test_sessions.db"
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            ht_json TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    conn.close()
    return str(db_path)

@patch("khora_kernel.engine.orchestrator.fval")
@patch("khora_kernel.proveedores.openai.ProveedorOpenAICompatible.generar")
@patch("khora_kernel.engine.orchestrator.ask")
def test_tvis_refinamiento_no_writes_to_pkg(mock_ask, mock_generar, mock_fval, temp_db):
    """
    Ensure that fallback (tVIS refinement) never writes to the PKG.
    """
    from khora_kernel.engine.history import Response
    from khora_kernel.engine.fval import ValidatedResponse
    from khora_kernel.api import RespuestaLLM
    from datetime import datetime

    # 1. Setup mocks
    session_id = str(uuid.uuid4())

    # Mock ask to return a response with our session_id
    mock_ask.side_effect = [
        Response(answer="Respuesta inicial sin contexto visual", citations=[], ht_ref=session_id),
        Response(answer="Respuesta final con contexto visual", citations=[], ht_ref=session_id)
    ]

    # Mock fval to return 'Insuficiente' first to trigger fallback, then 'Suficiente'
    mock_fval.side_effect = [
        ValidatedResponse(answer_marcado="Respuesta inicial sin contexto visual", claims=[], vt="Insuficiente"),
        ValidatedResponse(answer_marcado="Respuesta final con contexto visual", claims=[], vt="Suficiente")
    ]

    # Mock LLM generation in fallback
    mock_generar.return_value = RespuestaLLM(
        texto="Evidencia visual: Hay un gato en la imagen.",
        modelo="mock-model",
        provenance=Provenance(origen="test", driver="test", timestamp=datetime.utcnow().isoformat())
    )

    puerto_vision = MockPuertoVision()
    memoria_neo4j = MockMemoriaNeo4j()

    # Initialize DB with a dummy session so load_ht works
    from khora_kernel.engine.history import Ht, save_ht
    ht = Ht(session_id=session_id, created_at=datetime.utcnow().isoformat())
    save_ht(ht, temp_db)

    # 2. Execute ask_with_fallback
    result = ask_with_fallback(
        question="¿Qué hay en la imagen?",
        referencia_modalidad="metadata_node_123",
        puerto_vision=puerto_vision,
        session_id=session_id,
        db_path=temp_db,
        memoria_neo4j=memoria_neo4j
    )

    # 3. Assertions
    # Ensure result is from the second pass (Suficiente)
    assert result.vt == "Suficiente"
    assert result.answer_marcado == "Respuesta final con contexto visual"

    # Ensure fallback called the LLM with the image
    assert mock_generar.call_count == 1
    call_args = mock_generar.call_args[0][0]
    assert call_args.imagenes_base64 == ["base64_encoded_image_mock_data"]
    assert "¿Qué hay en la imagen?" in call_args.prompt

    # Check that Ht was updated with ephemeral evidence
    ht_final = load_ht(session_id, temp_db)
    assert len(ht_final.evidence) > 0
    fallback_evidence = [e for e in ht_final.evidence if e.node_id == "fallback_vqa"]
    assert len(fallback_evidence) == 1
    assert fallback_evidence[0].triple == "Evidencia visual: Hay un gato en la imagen."

    # **CRITICAL TEST**: Zero writes to the PKG
    assert memoria_neo4j.writes == 0, "Fallback wrote to the PKG (Neo4j)!"
