# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import pytest
import os
import json
import sqlite3
from typing import List, Any
from dataclasses import asdict

from khora_kernel.engine.core import ask
from khora_kernel.engine.history import Ht, Response, HtStep, HtEvidence, load_ht
from khora_kernel.embeddings import INDEX_FILE, MAP_FILE

class MemoriaNeo4jMock:
    def __init__(self, nodes, communities):
        self.nodes = nodes
        self.communities = communities
        self._driver = self # Mock driver
        self.query_count = 0

    def session(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query: str, parameters: dict = None):
        self.query_count += 1
        if "MATCH (c:Community" in query and "c.level AS level" in query and parameters is None:
            # get_all_communities
            class Result:
                def __init__(self, comms):
                    self.comms = comms
                def __iter__(self):
                    for c in self.comms:
                        yield {"cid": c["id"], "level": c.get("level", 0)}
            return Result(self.communities)

        elif "MATCH (c:Community" in query and parameters and "cid" in parameters:
            # get_community_info
            cid = parameters["cid"]
            for c in self.communities:
                if c["id"] == cid:
                    class Result:
                        def __init__(self, comm):
                            self.comm = comm
                        def single(self):
                            return {"level": self.comm.get("level", 0), "summary": self.comm.get("summary", ""), "tokens": 10}
                    return Result(c)
            class Result:
                def single(self): return None
            return Result()

        elif "MATCH (n) WHERE n.id = $id" in query:
            # _get_node_content
            node_id = parameters["id"]
            for n in self.nodes:
                if n["id"] == node_id:
                    class Result:
                        def __init__(self, node):
                            self.node = node
                        def single(self):
                            return {"desc": self.node.get("descripcion", ""), "text": self.node.get("text", "")}
                    return Result(n)
            class Result:
                def single(self): return None
            return Result()

        elif "MERGE" in query or "CREATE" in query or "SET" in query:
            raise Exception("PKG Write attempt detected!")

        class Result:
            def __iter__(self): return iter([])
            def single(self): return None
        return Result()

    def get_all_nodes(self):
        return self.nodes + self.communities

@pytest.fixture
def test_db_path(tmp_path):
    db_path = tmp_path / "data" / "khora_sessions.db"
    return str(db_path)

@pytest.fixture
def mock_memoria():
    nodes = [
        {"id": "node1", "label": "Entity", "descripcion": "La capital de Francia es París."},
        {"id": "node2", "label": "Entity", "descripcion": "La torre Eiffel está en París."}
    ]
    communities = [
        {"id": "comm1", "label": "Community", "level": 0, "summary": "París es una ciudad europea famosa por su torre."},
        {"id": "comm2", "label": "Community", "level": 1, "summary": "Europa es un continente con mucha historia."}
    ]
    return MemoriaNeo4jMock(nodes, communities)

@pytest.fixture(autouse=True)
def setup_index(mock_memoria):
    from khora_kernel.embeddings import index_all
    # Ensure index maps exist
    os.environ["KHORA_EMB_MODEL"] = "BAAI/bge-m3"

    # Save a fake map and index to avoid creating real ones in tests for now
    # We will just use index_all
    index_all(mock_memoria)
    yield
    # Cleanup
    if os.path.exists(INDEX_FILE):
        os.remove(INDEX_FILE)
    if os.path.exists(MAP_FILE):
        os.remove(MAP_FILE)


def test_multihop(test_db_path, mock_memoria, monkeypatch):
    # Mock LLM provider to return a specific string with citations
    class MockProvider:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            from datetime import datetime

            # Simulated multihop answer drawing from two entities
            ans = "La torre de la que hablas está en París [node1]. Sí, es la torre Eiffel [node2]. SUSTITUCIÓN NO VALIDADA"
            return RespuestaLLM(texto=ans, modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=datetime.utcnow().isoformat()))

    import khora_kernel.engine.core
    monkeypatch.setattr(khora_kernel.engine.core, "_get_provider", lambda: MockProvider())

    # "Dónde está la torre y cómo se llama?" -> Capital letters imply local query.
    res = ask("Dónde está la torre Eiffel y cómo se llama?", db_path=test_db_path, memoria_neo4j=mock_memoria)

    assert res.citations, "Debe haber citaciones"
    assert "node1" in res.citations
    assert "node2" in res.citations
    assert len(res.citations) >= 2


def test_mapeo_total(test_db_path, mock_memoria, monkeypatch):
    class MockProvider:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            from datetime import datetime
            # One sentence, one evidence. Another sentence, another evidence.
            ans = "La capital es París [node1]. Tiene una torre [node2]. SUSTITUCIÓN NO VALIDADA"
            return RespuestaLLM(texto=ans, modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=datetime.utcnow().isoformat()))

    import khora_kernel.engine.core
    monkeypatch.setattr(khora_kernel.engine.core, "_get_provider", lambda: MockProvider())

    res = ask("Hablame de París", db_path=test_db_path, memoria_neo4j=mock_memoria)

    sentences = [s.strip() for s in res.answer.split(".") if s.strip()]
    # Remove the SUSTITUCION NO VALIDADA for sentence checking
    sentences = [s for s in sentences if "SUSTITUCIÓN NO VALIDADA" not in s]

    for sentence in sentences:
        assert "[" in sentence and "]" in sentence, f"La oración '{sentence}' no mapea a una evidencia"


def test_ht_persistido(test_db_path, mock_memoria, monkeypatch):
    class MockProvider:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            from datetime import datetime
            return RespuestaLLM(texto="Hola [comm1].", modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=datetime.utcnow().isoformat()))

    import khora_kernel.engine.core
    monkeypatch.setattr(khora_kernel.engine.core, "_get_provider", lambda: MockProvider())

    session_id = "test-session-123"
    # lowercase words to trigger global
    res = ask("cuentame sobre europa", session_id=session_id, db_path=test_db_path, memoria_neo4j=mock_memoria)

    ht = load_ht(session_id, test_db_path)
    assert ht is not None
    assert ht.session_id == session_id
    assert len(ht.steps) == 4
    assert ht.steps[0].state == "RECIBIR"
    assert ht.steps[1].state == "RECUPERAR"
    assert ht.steps[2].state == "SINTETIZAR"
    assert ht.steps[3].state == "EMITIR"

    assert any(e.node_id == "comm1" for e in ht.evidence)


def test_no_escritura_pkg(test_db_path, mock_memoria, monkeypatch):
    class MockProvider:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            from datetime import datetime
            return RespuestaLLM(texto="Algo.", modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=datetime.utcnow().isoformat()))

    import khora_kernel.engine.core
    monkeypatch.setattr(khora_kernel.engine.core, "_get_provider", lambda: MockProvider())

    # We mock the PKG writes in our MemoriaNeo4jMock to raise an exception.
    # If ask() attempted to write, it would crash.
    queries_before = mock_memoria.query_count

    ask("cualquier cosa", db_path=test_db_path, memoria_neo4j=mock_memoria)

    queries_after = mock_memoria.query_count

    # Just asserting it didn't crash is sufficient since our mock raises an Exception on write queries (MERGE, CREATE, SET)
    assert queries_after > queries_before # It should have read at least


def test_esquemas(test_db_path, mock_memoria, monkeypatch):
    class MockProvider:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            from datetime import datetime
            return RespuestaLLM(texto="Esquemas [node1].", modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=datetime.utcnow().isoformat()))

    import khora_kernel.engine.core
    monkeypatch.setattr(khora_kernel.engine.core, "_get_provider", lambda: MockProvider())

    res = ask("Dime algo de París", db_path=test_db_path, memoria_neo4j=mock_memoria)

    assert isinstance(res, Response)
    assert hasattr(res, "answer")
    assert hasattr(res, "citations")
    assert hasattr(res, "ht_ref")

    ht = load_ht(res.ht_ref, test_db_path)
    assert isinstance(ht, Ht)

    # They should be frozen
    with pytest.raises(Exception): # dataclass FrozenInstanceError
        res.answer = "mutated"

    with pytest.raises(Exception):
        ht.session_id = "mutated"
