# @l0 L0-002 · @req ING-03/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-05
import pytest
from neo4j import GraphDatabase

from khora_kernel.api import (
    ObjetoDeInformacion,
    Provenance,
    PuertoEmbeddings,
    PuertoLLM,
    RespuestaLLM,
)
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada
from khora_kernel.poblacion._ingestar import ingestar


class MockPuertoLLM(PuertoLLM):
    def generar(self, solicitud) -> RespuestaLLM:
        prompt = solicitud.prompt
        if "Extrae entidades" in prompt:
            # Emite un triple
            return RespuestaLLM(texto="n1, MENTIONED, n2", modelo="mock", provenance=Provenance("mock", None, "2026-07-23T12:00:00Z"))
        if "Evalúa si la nueva entidad" in prompt:
            return RespuestaLLM(texto="MERGE", modelo="mock", provenance=Provenance("mock", None, "2026-07-23T12:00:00Z"))
        return RespuestaLLM(texto="NO", modelo="mock", provenance=Provenance("mock", None, "2026-07-23T12:00:00Z"))

class MockPuertoEmbeddings(PuertoEmbeddings):
    def incrustar(self, textos: list[str]) -> list[list[float]]:
        return [[0.1, 0.2, 0.3]] * len(textos)

@pytest.fixture(scope="module")
def neo4j_driver(neo4j_config):
    driver = GraphDatabase.driver(neo4j_config["uri"], auth=(neo4j_config["user"], neo4j_config["password"]))
    yield driver
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()

def test_ing_03_acr_1_1_acr_1_2(neo4j_driver, neo4j_config):
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()

    # Clear DB before test
    with neo4j_driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    prov1 = Provenance(origen="test1", driver="test", timestamp="2026-07-23T10:00:00Z")
    obj1 = ObjetoDeInformacion(
        id="o1",
        texto="Contenido de prueba",
        provenance=prov1,
        metadata={"autor": "Autor1", "fecha": "2026-07-23"}
    )

    # Ingesta 1
    acta1 = ingestar(obj1, memoria, llm, emb)
    assert acta1.triples_escritos > 0

    # Retrieve valid_at for the created relation
    with neo4j_driver.session() as session:
        result = session.run("MATCH (a)-[r:RELATION]->(b) RETURN r.valid_at AS v, r.invalid_at AS i, r.provenance AS p")
        records = list(result)
        assert len(records) > 0
        for rec in records:
            # ACR-1.2
            assert str(rec["v"]).startswith("2026-07-23T10:00:00")
            assert rec["i"] is None

    # Ingesta 2 (idéntica)
    acta2 = ingestar(obj1, memoria, llm, emb)
    # ACR-1.1: Conteo de escrituras debe ser 0 para elementos preexistentes no afectados
    # Only properties_set could be counted if it hits the same nodes? No, should be 0 because of the IGNORE logic
    # Actually nodes are MERGEd, MERGE on existing node with same canonical_key does not create properties if it exists,
    # unless ON MATCH SET is used. In our Cypher query, we only have ON CREATE SET for nodes.
    # So 0 writes.
    assert acta2.triples_escritos == 0
