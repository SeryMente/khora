# @l0 L0-002 · @req ING-05/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua —
import pytest
import os
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada
from khora_kernel.summaries.fsum import fsum
from khora_kernel.api import PuertoLLM, SolicitudLLM, RespuestaLLM, Provenance

class MockPuertoLLM(PuertoLLM):
    def __init__(self):
        self.calls = []

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        self.calls.append(solicitud.prompt)
        return RespuestaLLM(texto="Resumen mockeado", modelo="mock", provenance=Provenance("mock", None, "2026-07-23T12:00:00Z"))

# Parcheamos fsum.py para inyectar nuestro mock si no hay variables de entorno LLM
import khora_kernel.summaries.fsum as fsum_module

@pytest.fixture(scope="module")
def neo4j_driver(neo4j_config):
    from neo4j import GraphDatabase
    try:
        driver = GraphDatabase.driver(neo4j_config["uri"], auth=(neo4j_config["user"], neo4j_config["password"]))
        driver.verify_connectivity()
    except Exception as e:
        pytest.skip(f"PENDIENTE DE VERIFICACIÓN MANUAL: No hay BD Neo4j en CI - {e}")

    yield driver

    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()

def setup_db(driver):
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

        # Insertar datos de prueba: 2 comunidades (una hoja, una raíz)
        # Nodos y aristas con invalid_at nulo
        query = """
        CREATE (c1:Community {community_id: 'C1', level: 0})
        CREATE (c2:Community {community_id: 'C2', level: 1})

        CREATE (e1:Entity {id: 'E1', canonical_key: 'Ent1'})
        CREATE (e2:Entity {id: 'E2', canonical_key: 'Ent2'})

        CREATE (e1)-[:IN_COMMUNITY]->(c1)
        CREATE (e2)-[:IN_COMMUNITY]->(c1)
        CREATE (e1)-[:RELATION]->(e2)

        CREATE (c1)-[:PARENT_COMMUNITY]->(c2)
        """
        session.run(query)

def test_ing_05_acr_1_1_and_1_2(neo4j_driver, neo4j_config, monkeypatch):
    setup_db(neo4j_driver)

    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    mock_llm = MockPuertoLLM()

    # Inyectamos el mock en el fsum para evitar llamadas a la red reales (y por falta de API keys en CI)
    class FakeProveedor:
        def __init__(self, *args, **kwargs):
            pass
        def generar(self, solicitud):
            return mock_llm.generar(solicitud)

    monkeypatch.setattr(fsum_module, "ProveedorOpenAICompatible", FakeProveedor)

    # Ejecutamos
    fsum(memoria)

    # Verificamos ACR-1.1: Persistencia
    with neo4j_driver.session() as session:
        result = session.run("MATCH (c:Community) RETURN c.community_id as cid, c.summary as summary ORDER BY c.level ASC")
        records = list(result)
        assert len(records) == 2
        assert records[0]["cid"] == "C1"
        assert records[0]["summary"] == "Resumen mockeado"
        assert records[1]["cid"] == "C2"
        assert records[1]["summary"] == "Resumen mockeado"

    # Verificamos ACR-1.2: Orden jerárquico (hoja procesada antes que raíz)
    assert len(mock_llm.calls) == 2
    # C1 (level 0) debe procesarse primero
    assert "C1" in mock_llm.calls[0]
    assert "C2" in mock_llm.calls[1]

    # Adicionalmente verificamos map-reduce, la llamada de la raíz (C2) debe incluir contexto de C1
    assert "C1" in mock_llm.calls[1]
