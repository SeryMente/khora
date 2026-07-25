# @l0 L0-002 · @req ING-04/REQ-1,REQ-2 · @acr ACR-1.1,ACR-2.1 · @ua UA-10,UA-11,UA-12,UA-13
import pytest
from datetime import datetime
import logging
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada
from khora_kernel.api import ObjetoDeInformacion, Provenance
from khora_kernel.poblacion import ingestar

class DummyPuertoLLM:
    def generar(self, solicitud):
        from khora_kernel.api import RespuestaLLM, Provenance
        return RespuestaLLM(
            texto="Dummy response",
            modelo="dummy",
            provenance=Provenance("sys", None, "2024-01-01T00:00:00Z")
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
    except Exception as e:
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

    assert any("recalculo disparado por ingesta=obj-1" in record.message for record in caplog.records)
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
        res1 = session.run("MATCH (c:Community) WHERE c.invalid_at IS NULL RETURN count(c) AS cnt").single()["cnt"]

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
