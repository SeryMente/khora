# @l0 L0-002-R · @req RAZ-02/REQ-2 · @acr ACR-2.1

from khora_kernel.api import (
    AristaSubgrafo,
    NodoSubgrafo,
    Provenance,
    RespuestaLLM,
)
from khora_kernel.engine.core import ask
from khora_kernel.engine.history import load_ht


class MemoriaNeo4jMock:
    def __init__(self, nodes, communities):
        self.nodes = nodes
        self.communities = communities
        self.query_count = 0

    def mock_multi_hop(self, seeds, contexto, max_hops):
        self.query_count += 1
        selected = [n for n in self.nodes if n["id"] in {"node1", "node2"}]
        fragmentos = [
            type("F", (), {
                "id": n["id"],
                "texto": n["descripcion"],
                "provenance": Provenance("mock", None, "2026-01-01T00:00:00Z"),
                "visibilidad": contexto,
            })()
            for n in selected
        ]
        nodos = [NodoSubgrafo(n["id"], "Entity") for n in selected]
        aristas = [AristaSubgrafo("node1", "node2", "related_to")]
        return fragmentos, nodos, aristas, True, False

    def get_all_nodes(self):
        return self.nodes + self.communities

    def get_graph_revision(self):
        return "mock-revision"


def make_memory():
    return MemoriaNeo4jMock(
        [
            {"id": "node1", "label": "Entity", "descripcion": "La capital de Francia es París."},
            {"id": "node2", "label": "Entity", "descripcion": "La torre Eiffel está en París."},
        ],
        [
            {"id": "comm1", "label": "Community", "level": 0, "summary": "París es una ciudad europea famosa por su torre."},
        ],
    )


class EpisTwinMockProvider:
    def __init__(self):
        self.policy_calls = 0

    def generar(self, solicitud):
        role = solicitud.metadata.get("role")
        if role == "pi_theta":
            self.policy_calls += 1
            action = (
                '{"accion":"RETRIEVE","justificacion":"Necesito G* estructural."}'
                if self.policy_calls == 1
                else '{"accion":"ANSWER","justificacion":"Tengo G* suficiente."}'
            )
            return RespuestaLLM(
                action,
                "mock",
                Provenance("mock", None, "2026-01-01T00:00:00Z"),
            )
        if role == "P_phi_generator":
            return RespuestaLLM(
                "La torre está en París [node1] y es la torre Eiffel [node2].",
                "mock",
                Provenance("mock", None, "2026-01-01T00:00:00Z"),
            )
        if role == "fVAL":
            return RespuestaLLM(
                '{"vt":"Sufficient","deficit_type":null,"reason":"G* respalda la respuesta."}',
                "mock",
                Provenance("mock", None, "2026-01-01T00:00:00Z"),
            )
        return RespuestaLLM(
            '{"accion":"ANSWER","justificacion":"Compatibilidad"}',
            "mock",
            Provenance("mock", None, "2026-01-01T00:00:00Z"),
        )


def install_provider(monkeypatch):
    import khora_kernel.engine.core as core
    monkeypatch.setattr(core, "_get_provider", lambda: EpisTwinMockProvider())
    monkeypatch.setattr(core, "_provider", lambda: EpisTwinMockProvider())


def test_multihop(tmp_path, monkeypatch):
    memory = make_memory()
    install_provider(monkeypatch)
    result = ask("Dónde está la torre Eiffel y cómo se llama?", db_path=str(tmp_path / "db.sqlite"), memoria_grafo=memory)
    assert {"node1", "node2"} <= set(result.citations)


def test_mapeo_total(tmp_path, monkeypatch):
    memory = make_memory()
    install_provider(monkeypatch)
    result = ask("Hablame de París", db_path=str(tmp_path / "db.sqlite"), memoria_grafo=memory)
    for sentence in result.answer.split("."):
        if sentence.strip():
            assert "[" in sentence and "]" in sentence


def test_ht_persistido(tmp_path, monkeypatch):
    memory = make_memory()
    install_provider(monkeypatch)
    db = str(tmp_path / "data" / "sessions.db")
    result = ask("cuentame sobre europa", session_id="test-session-123", db_path=db, memoria_grafo=memory)
    ht = load_ht(result.ht_ref, db)
    assert ht is not None
    states = [step.state for step in ht.steps]
    assert "RETRIEVE" in states
    assert "ANSWER" in states
    assert ht.trace
    assert any(event.get("action") == "RETRIEVE" for event in ht.trace)
    assert len(ht.evidence) >= 2
    evidence_by_id = {item.node_id: item for item in ht.evidence}
    assert {"node1", "node2"} <= set(evidence_by_id)
    assert all("origen=mock" in evidence_by_id[node_id].triple for node_id in ("node1", "node2"))
    assert all("texto=" in evidence_by_id[node_id].triple for node_id in ("node1", "node2"))
    assert all(evidence_by_id[node_id].source_step > 0 for node_id in ("node1", "node2"))


def test_no_escritura_pkg(tmp_path, monkeypatch):
    memory = make_memory()
    install_provider(monkeypatch)
    before = memory.query_count
    ask("cualquier cosa", db_path=str(tmp_path / "db.sqlite"), memoria_grafo=memory)
    assert memory.query_count > before
