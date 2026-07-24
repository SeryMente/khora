# @l0 L0-002 · @req PKG-00/REQ-1 · @acr ACR-1.1
# @ua UA-01, UA-02, UA-03, UA-04
import pytest
from neo4j import GraphDatabase

from khora_kernel.api import Provenance, Triple
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada


@pytest.fixture(scope="module")
def neo4j_driver(neo4j_config):
    driver = GraphDatabase.driver(neo4j_config["uri"], auth=(neo4j_config["user"], neo4j_config["password"]))
    yield driver

    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()

def test_acr_1_1_restriccion_union_disjunta(neo4j_driver, neo4j_config):
    # ACR-1.1: inserción de nodo con doble clase rechazada por restricción real.
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    # Simulate a transaction that creates a double-labeled node, which should trigger rollback logic.
    # Note: the python client logic enforces this on merge_entidad / escribir_ingesta.

    # Let's bypass the API and write a bad node, then try to run `escribir_ingesta` which should catch it and rollback.
    with neo4j_driver.session() as session:
        session.run("CREATE (n:Entity:Literal {canonical_key: 'doble_clase'})")

    provenance = Provenance("test", "driver1", "2026-07-23T12:00:00Z")
    triple = Triple(
        id="t1",
        origen_id="doble_clase",
        destino_id="otro_nodo",
        relacion="TEST",
        provenance=provenance,
        metadata={}
    )

    with pytest.raises(ValueError, match="Violación de restricción real"):
        memoria.escribir_ingesta([triple], provenance)

    with neo4j_driver.session() as session:
        session.run("MATCH (n:Entity:Literal {canonical_key: 'doble_clase'}) DETACH DELETE n")


def test_acr_1_2_alcanzabilidad(neo4j_driver, neo4j_config):
    # ACR-1.2: consulta de alcanzabilidad desde u cubre el 100% de los nodos del fixture real.
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    with neo4j_driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    provenance = Provenance("test", "driver1", "2026-07-23T12:00:00Z")

    # Try inserting an orphan node
    # Since `escribir_ingesta` creates the root node, if we just link two new nodes, they will be orphans.
    triple_orphan = Triple(
        id="t2",
        origen_id="n1",
        destino_id="n2",
        relacion="TEST",
        provenance=provenance,
        metadata={}
    )

    # This should return 0 (rollback)
    escritos = memoria.escribir_ingesta([triple_orphan], provenance)
    assert escritos == 0

    # Try inserting a reachable node
    triple_reachable = Triple(
        id="t3",
        origen_id="root",
        destino_id="n1",
        relacion="TEST",
        provenance=provenance,
        metadata={}
    )

    escritos = memoria.escribir_ingesta([triple_reachable], provenance)
    assert escritos == 1

    # Verify 100% reachability from root
    with neo4j_driver.session() as session:
        res = session.run("MATCH (n) WHERE NOT (n:User AND n.id='root') AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) } RETURN count(n) as orphans")
        orphans = res.single()["orphans"]
        assert orphans == 0


def test_acr_2_1_campos_bitemporales(neo4j_driver, neo4j_config):
    # ACR-2.1: inserción sin los tres campos es rechazada.
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    with neo4j_driver.session() as session:
        # Intentionally create a node missing bitemporal fields
        session.run("CREATE (n:Entity {canonical_key: 'n_invalid'})")

    provenance = Provenance("test", "driver1", "2026-07-23T12:00:00Z")
    triple = Triple(
        id="t4",
        origen_id="root",
        destino_id="n_invalid",
        relacion="TEST",
        provenance=provenance,
        metadata={}
    )

    # Ingestion should catch the invalid node and rollback
    with pytest.raises(ValueError, match="Violación de restricción bi-temporal"):
        memoria.escribir_ingesta([triple], provenance)
