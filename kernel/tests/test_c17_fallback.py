import os
import sqlite3
import pytest
from typing import Any
import importlib

from khora_kernel.engine.orchestrator import ask_with_fallback
from khora_kernel.engine.history import load_ht


# Mock para PuertoVision
class MockVisionPort:
    def extraer_evidencia(self, referencia: str) -> str:
        return "El perro de la imagen es de color marrón y está saltando. Evidencia Visual VQA."


# Mock para Core y FVAL
# (Podemos inyectar mocks, o usar la lógica real mockeando las llamadas a LLM y KNN)
# Como la base de datos real Neo4j no debe ser escrita, mockearemos Neo4j también

class MockNeo4jDriver:
    def session(self):
        raise NotImplementedError("NO DEBE LLAMARSE A NEO4J")


class MockNeo4jMemoria:
    def __init__(self):
        self._driver = MockNeo4jDriver()


@pytest.fixture
def tmp_db(tmp_path):
    db_file = tmp_path / "khora_sessions.db"
    # init_db de history.py creará el esquema correcto
    from khora_kernel.engine.history import init_db
    init_db(str(db_file))
    return str(db_file)


@pytest.fixture
def mock_llm_provider(monkeypatch):
    from khora_kernel.api import RespuestaLLM, Provenance

    class MockProvider:
        def __init__(self):
            self.call_count = 0

        def generar(self, solicitud):
            self.call_count += 1
            if "Evidencia Visual VQA" in solicitud.prompt:
                # Segunda llamada (re-síntesis)
                return RespuestaLLM(
                    texto="El perro es marrón [fallback_vqa].",
                    modelo="mock",
                    provenance=Provenance(origen="mock", driver=None, timestamp="now")
                )
            else:
                # Primera llamada (falla en evidencia)
                return RespuestaLLM(
                    texto="No estoy seguro de qué color es el perro. El cielo es azul.",
                    modelo="mock",
                    provenance=Provenance(origen="mock", driver=None, timestamp="now")
                )

    # También necesitamos mockear el juez LLM
    class MockJudgeProvider:
        def generar(self, solicitud):
            if "Evidencia Visual VQA" in solicitud.prompt or "fallback_vqa" in solicitud.prompt:
                return RespuestaLLM(
                    texto="SUPPORTED: fallback_vqa",
                    modelo="mock",
                    provenance=Provenance(origen="mock", driver=None, timestamp="now")
                )
            else:
                return RespuestaLLM(
                    texto="UNSUPPORTED",
                    modelo="mock",
                    provenance=Provenance(origen="mock", driver=None, timestamp="now")
                )

    provider_mock = MockProvider()
    judge_mock = MockJudgeProvider()

    import khora_kernel.engine.core as core_mod
    monkeypatch.setattr(core_mod, "_get_provider", lambda: provider_mock)

    # El fval as fval_mod no funciona porque "fval" es también el nombre de la función en __init__
    import importlib
    fval_module = importlib.import_module("khora_kernel.engine.fval")
    monkeypatch.setattr(fval_module, "get_judge_provider", lambda: judge_mock)

    # Mockear knn para no cargar FAISS (ya que causa errores si no está instalado)
    monkeypatch.setattr(core_mod, "knn", lambda q, k: [])

    # Mockear get_all_communities
    import khora_kernel.summaries as summ_mod
    monkeypatch.setattr(summ_mod, "get_all_communities", lambda db: [])
    monkeypatch.setattr(summ_mod, "get_community_info", lambda db, cid: {})

    return provider_mock


def test_fallback_activation(tmp_db, mock_llm_provider, monkeypatch):
    # Asegurar que el entorno indica fVAL
    os.environ["KHORA_FVAL_MODE"] = "mark"

    vision_port = MockVisionPort()
    neo4j_mem = MockNeo4jMemoria()

    question = "¿De qué color es el perro en la imagen? Maria."
    referencia = "img_001.jpg"

    # Ejecutar el flujo orquestado
    final_val_resp = ask_with_fallback(
        question=question,
        referencia_modalidad=referencia,
        puerto_vision=vision_port,
        db_path=tmp_db,
        memoria_neo4j=neo4j_mem
    )

    # Verificaciones
    # 1. El veredicto final debería ser Suficiente (porque el mock devuelve SUPPORTED)
    assert final_val_resp.vt == "Suficiente"
    assert "[fallback_vqa]" in final_val_resp.answer_marcado

    # 2. Verificar que se disparó el fallback y está en Ht
    ht = load_ht(final_val_resp.claims[0]["ts"] if final_val_resp.claims else "missing", tmp_db)
    # El ts no es el session_id, necesitamos sacar el session_id
    # Para eso, usamos sqlite
    conn = sqlite3.connect(tmp_db)
    cursor = conn.cursor()
    cursor.execute("SELECT session_id FROM sessions LIMIT 1")
    session_id = cursor.fetchone()[0]
    conn.close()

    ht = load_ht(session_id, tmp_db)

    # Comprobar la transición en los steps
    steps_states = [s.state for s in ht.steps]
    assert "FALLBACK" in steps_states, "La transición FALLBACK no es observable en Ht"

    # Comprobar que la evidencia efímera se inyectó
    fallback_evidence = [e for e in ht.evidence if e.node_id == "fallback_vqa"]
    assert len(fallback_evidence) == 1, "La evidencia del fallback no se guardó en Ht"
    assert "Evidencia Visual VQA" in fallback_evidence[0].triple

    # 3. Test estricto de cero escrituras en Neo4j PKG
    # MockNeo4jDriver lanzaría NotImplementedError si se llamara a driver.session()
    # (Ya que está en nuestro mock y no levantó excepción, sabemos que no se tocó el PKG)
