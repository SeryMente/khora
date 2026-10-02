# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
# @l0 L0-002 · @req ING-04/REQ-1,REQ-2 · @acr ACR-1.1,ACR-2.1 · @ua UA-10,UA-11,UA-12,UA-13
import logging

import pytest

from khora_kernel.api import ObjetoDeInformacion, Provenance
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada
from khora_kernel.poblacion import ingestar


class DummyPuertoLLM:
    def generar(self, solicitud):
        from khora_kernel.api import Provenance, RespuestaLLM

        prompt = solicitud.prompt or ""
        if "¿Faltaron entidades" in prompt:
            texto = "NO"
        elif "Extrae entidades y relaciones" in prompt:
            texto = "A, interactua_con, B, Concepto\nB, relacionado_con, C, Concepto"
        else:
            texto = "Resumen de prueba"
        return RespuestaLLM(
            texto=texto,
            modelo="dummy",
            provenance=Provenance("sys", None, "2024-01-01T00:00:00Z"),
        )

class DummyPuertoEmbeddings:
    def incrustar(self, textos):
        return [[0.0] * 1024 for _ in textos]


@pytest.fixture
def memoria_limpia(neo4j_config):

    try:
        mem = Neo4jMemoriaOrganizada(uri=neo4j_config["uri"], user=neo4j_config["user"], password=neo4j_config["password"])
        with mem._driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
    except Exception:
        pytest.skip("PENDIENTE DE VERIFICACIÓN MANUAL - Neo4j no disponible en sandbox")

    yield mem

    with mem._driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    mem.cerrar()

def test_ing_04_acr_1_1(memoria_limpia, caplog):
    caplog.set_level(logging.INFO)

    ts = "2024-05-01T12:00:00Z"
    objeto = ObjetoDeInformacion(
        id="obj-1",
        texto="La entidad A se relaciona con B.",
        provenance=Provenance(origen="test", driver="dummy", timestamp=ts),
        metadata={}
    )

    # Needs a dummy on_upsert that actually points to psi's or just test the real flow
    from khora_kernel.psi import on_node_upserted
    ingestar(objeto, memoria_limpia, DummyPuertoLLM(), DummyPuertoEmbeddings(), on_upsert=on_node_upserted)

    assert any("[PIPELINE] recalculo disparado por ingesta=obj-1" in record.message for record in caplog.records)
    assert any("ts=2024-05-01T12:00:00Z" in record.message for record in caplog.records)

def test_ing_04_acr_2_1(memoria_limpia):
    ts = "2024-05-01T12:00:00Z"
    objeto = ObjetoDeInformacion(
        id="obj-2",
        texto="A interactua con B y C.",
        provenance=Provenance(origen="test", driver="dummy", timestamp=ts),
        metadata={}
    )
    from khora_kernel.psi import on_node_upserted
    ingestar(objeto, memoria_limpia, DummyPuertoLLM(), DummyPuertoEmbeddings(), on_upsert=on_node_upserted)

    # Check the nodes and fields
    with memoria_limpia._driver.session() as session:
        # check Community nodes
        result = session.run("MATCH (c:Community) RETURN count(c) AS cnt")
        assert result.single()["cnt"] > 0

        # Check bi-temporal fields on communities
        result = session.run("MATCH (c:Community) RETURN c.created_at AS c, c.valid_at AS v, c.invalid_at AS i, c.level AS lvl")
        for record in result:
            assert record["c"] is not None
            assert record["v"] is not None
            assert record["i"] is None
            assert record["lvl"] is not None

        # Check IN_COMMUNITY relationships and their bitemporal fields
        result = session.run("MATCH ()-[r:IN_COMMUNITY]->() RETURN r.created_at AS c, r.valid_at AS v, r.invalid_at AS i")
        count = 0
        for record in result:
            count += 1
            assert record["c"] is not None
            assert record["v"] is not None
            assert record["i"] is None
        assert count > 0

def test_graph_revision_cambia_con_predicado_semantico(neo4j_config):
    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"],
        neo4j_config["user"],
        neo4j_config["password"],
    )
    try:
        with memoria._driver.session() as session:
            session.run("MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n", ids=["rev-A", "rev-B"])
            session.run(
                """
                CREATE (a:Entity {canonical_key:'rev-A', id:'rev-A', label_original:'A',
                    invalid_at:null, created_at:datetime(), valid_at:datetime()})
                CREATE (b:Entity {canonical_key:'rev-B', id:'rev-B', label_original:'B',
                    invalid_at:null, created_at:datetime(), valid_at:datetime()})
                CREATE (a)-[:RELATION {type:'HAS_NAME', io_id:'rev-test',
                    invalid_at:null, created_at:datetime(), valid_at:datetime()}]->(b)
                """
            )
        before = memoria.get_graph_revision()
        with memoria._driver.session() as session:
            session.run(
                """
                MATCH (a:Entity {canonical_key:'rev-A'})-[r:RELATION {io_id:'rev-test'}]->(b:Entity {canonical_key:'rev-B'})
                SET r.type = 'HAS_ALIAS'
                """
            )
        after = memoria.get_graph_revision()
        assert after != before
    finally:
        with memoria._driver.session() as session:
            session.run("MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n", ids=["rev-A", "rev-B"])
        memoria.cerrar()


def test_graph_revision_cambia_con_valor_de_nodo(neo4j_config):
    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"],
        neo4j_config["user"],
        neo4j_config["password"],
    )
    try:
        with memoria._driver.session() as session:
            session.run(
                "MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n",
                ids=["rev-value"],
            )
            session.run(
                """
                CREATE (e:Literal {
                    canonical_key:'rev-value', id:'rev-value',
                    value:'42', datatype:'integer',
                    invalid_at:null, created_at:datetime(), valid_at:datetime()
                })
                """
            )
        before = memoria.get_graph_revision()
        with memoria._driver.session() as session:
            session.run(
                "MATCH (e:Literal {canonical_key:'rev-value'}) SET e.value = '43'"
            )
        after_value = memoria.get_graph_revision()
        assert after_value != before

        with memoria._driver.session() as session:
            session.run(
                "MATCH (e:Literal {canonical_key:'rev-value'}) SET e.datatype = 'float'"
            )
        after_datatype = memoria.get_graph_revision()
        assert after_datatype != after_value
    finally:
        with memoria._driver.session() as session:
            session.run(
                "MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n",
                ids=["rev-value"],
            )
        memoria.cerrar()


def test_psi_pipeline_propaga_revision_y_orden(monkeypatch):
    from khora_kernel import psi

    calls = []

    manifest = {
        "graph_revision": "rev-canonica",
        "communities": [{"community_id": "c1"}],
    }

    def fake_leiden(node_id, memoria, ts):
        calls.append(("leiden", node_id, ts))
        return manifest

    def fake_summary(memoria, provider, graph_revision):
        calls.append(("fsum", graph_revision))

    class FakeMemoria:
        def publicar_comunidades(self, graph_revision, ts):
            calls.append(("publish", graph_revision, ts))

    def fake_rebuild(memoria, graph_revision):
        calls.append(("index", graph_revision))
        return {"graph_revision": graph_revision, "nodes_indexed": 2}

    monkeypatch.setattr(psi, "recalcular_leiden", fake_leiden)
    monkeypatch.setattr("khora_kernel.summaries.summarize_all", fake_summary)
    monkeypatch.setattr(psi, "rebuild_index", fake_rebuild)

    result = psi.on_node_upserted(
        "io-psi",
        FakeMemoria(),
        ts="2026-10-02T20:00:00Z",
        puerto_llm=object(),
    )

    assert result["graph_revision"] == "rev-canonica"
    assert [item[0] for item in calls] == ["leiden", "fsum", "publish", "index"]
    assert calls[1][1] == "rev-canonica"
    assert calls[2][1] == "rev-canonica"
    assert calls[3][1] == "rev-canonica"


def test_salud_grafo_runtime_invariantes(neo4j_config):
    from khora_kernel.motor import Neo4jMemoriaOrganizada

    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"],
        neo4j_config["user"],
        neo4j_config["password"],
    )
    try:
        checks = memoria.salud_grafo()
        expected = {
            "typed_overlap",
            "missing_temporal_nodes",
            "missing_temporal_edges",
            "unreachable_entities",
            "active_membership_to_invalid_community",
            "eligible_without_active_community",
            "active_communities_without_members",
        }
        assert expected.issubset(checks)
        assert all(checks[key] == 0 for key in expected)
        assert isinstance(checks["graph_revision"], str)
    finally:
        memoria.cerrar()


def test_ing_04_acr_invalidacion(memoria_limpia):
    ts1 = "2024-05-01T12:00:00Z"
    objeto1 = ObjetoDeInformacion(
        id="obj-3",
        texto="A interactua con B.",
        provenance=Provenance(origen="test", driver="dummy", timestamp=ts1),
        metadata={}
    )
    from khora_kernel.psi import on_node_upserted
    ingestar(objeto1, memoria_limpia, DummyPuertoLLM(), DummyPuertoEmbeddings(), on_upsert=on_node_upserted)

    with memoria_limpia._driver.session() as session:
        session.run("MATCH (c:Community) WHERE c.invalid_at IS NULL RETURN count(c) AS cnt").single()["cnt"]

    # second insert
    ts2 = "2024-05-02T12:00:00Z"
    objeto2 = ObjetoDeInformacion(
        id="obj-4",
        texto="C interactua con D.",
        provenance=Provenance(origen="test", driver="dummy", timestamp=ts2),
        metadata={}
    )
    ingestar(objeto2, memoria_limpia, DummyPuertoLLM(), DummyPuertoEmbeddings(), on_upsert=on_node_upserted)

    with memoria_limpia._driver.session() as session:
        # Check prev communities are invalidated
        invalidated = session.run("MATCH (c:Community) WHERE c.invalid_at IS NOT NULL RETURN count(c) AS cnt").single()["cnt"]
        assert invalidated > 0

        # Check active communities exist
        active = session.run("MATCH (c:Community) WHERE c.invalid_at IS NULL RETURN count(c) AS cnt").single()["cnt"]
        assert active > 0

        # Check no active IN_COMMUNITY points to invalid Community
        bad_edges = session.run("MATCH (c:Community)<-[r:IN_COMMUNITY]-() WHERE c.invalid_at IS NOT NULL AND r.invalid_at IS NULL RETURN count(r) AS cnt").single()["cnt"]
        assert bad_edges == 0
