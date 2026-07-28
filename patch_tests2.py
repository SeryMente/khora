import re

with open("kernel/src/khora_kernel/motor/tests/test_bitemporal_pkg.py", "r") as f:
    content = f.read()

replacement = """
def test_acr_1_2_alcanzabilidad(neo4j_driver, neo4j_config):
    # ACR-1.2: Ingestion properly anchors nodes so they are reachable
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    provenance = Provenance("test", "driver1", "2026-07-23T12:00:00Z")

    triple_reachable = Triple(
        id="t3",
        origen_id="n1",
        destino_id="n2",
        relacion="TEST",
        provenance=provenance,
        metadata={},
        valid_at=provenance.timestamp,
        invalid_at=None,
        created_at=provenance.timestamp
    )

    escritos = memoria.escribir_ingesta([triple_reachable], provenance)
    assert escritos == 1

    # Verify relationships created
    with neo4j_driver.session() as session:
        # Check actual triple exists
        res = session.run("MATCH (n1:Entity {canonical_key:'n1'})-[r:RELATION {type:'TEST'}]->(n2:Entity {canonical_key:'n2'}) RETURN count(r) as count")
        assert res.single()["count"] == 1

        # Check anchor chain exists
        res = session.run("MATCH (:User {id:'root'})-[:OWNS]->(:InformationObject)-[:MENTIONS]->(:Entity {canonical_key:'n1'}) RETURN count(1) as count")
        assert res.single()["count"] >= 1

        # Verify 100% reachability from root (Global scan gives 0 orphans)
        res = session.run("MATCH (n:Entity) WHERE NOT (n)-[:MATIZ_DE]->() AND NOT (n:User AND n.id='root') AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) } RETURN count(n) as orphans")
        assert res.single()["orphans"] == 0

def test_acr_1_2_alcanzabilidad_reanclaje(neo4j_driver, neo4j_config):
    # Prueba A: Verify that re-anchoring happens if a node was manually disconnected
    memoria = Neo4jMemoriaOrganizada(
        uri=neo4j_config["uri"],
        user=neo4j_config["user"],
        password=neo4j_config["password"]
    )

    # Disconnect graph manually
    with neo4j_driver.session() as session:
        session.run("MATCH (:User{id:'root'})-[o:OWNS]->() DELETE o")

    provenance = Provenance("test", "driver1", "2026-07-24T12:00:00Z")

    triple_reanchor = Triple(
        id="t4",
        origen_id="n1", # Reuse previously written node
        destino_id="n3", # New node
        relacion="TEST",
        provenance=provenance,
        metadata={},
        valid_at=provenance.timestamp,
        invalid_at=None,
        created_at=provenance.timestamp
    )

    # Should re-anchor properly and return 1, NOT 0
    escritos = memoria.escribir_ingesta([triple_reanchor], provenance)
    assert escritos == 1

    with neo4j_driver.session() as session:
        # Check chain was rebuilt
        res = session.run("MATCH (:User {id:'root'})-[:OWNS]->(:InformationObject)-[:MENTIONS]->(:Entity {canonical_key:'n1'}) RETURN count(1) as count")
        assert res.single()["count"] >= 1

        res = session.run("MATCH (n:Entity) WHERE NOT (n)-[:MATIZ_DE]->() AND NOT (n:User AND n.id='root') AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) } RETURN count(n) as orphans")
        assert res.single()["orphans"] == 0

def test_acr_1_2_alcanzabilidad_excepcion_contrato(mocker):
    # Prueba B: Contrato test con dobles. Inyecta orfandad para asegurar HuerfanosDetectadosError y rollback.
    # No simula contra la base real Neo4j, valida puramente la guardia del contrato.
    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada, HuerfanosDetectadosError

    memoria = Neo4jMemoriaOrganizada(uri="bolt://dummy", user="dummy", password="pwd")

    # Create mock session and tx
    mock_session = mocker.MagicMock()
    mock_tx = mocker.MagicMock()

    memoria._driver = mocker.MagicMock()
    memoria._driver.session.return_value.__enter__.return_value = mock_session
    mock_session.begin_transaction.return_value.__enter__.return_value = mock_tx

    # Setup answers for tx.run:
    # 1. triples result count
    # 2. anclaje
    # 3. violaciones union disjunta (0)
    # 4. bitemporal valid (0)
    # 5. orphans check (returns mocked huerfanos list)

    def side_effect_tx_run(query, **kwargs):
        mock_result = mocker.MagicMock()
        if "count(r) as count" in query:
             mock_result.single.return_value = {"count": 1}
        elif "count(n) as violaciones" in query:
             mock_result.__iter__.return_value = [[0]]
        elif "count(n) as nodos_invalidos" in query:
             mock_result.__iter__.return_value = [[0]]
        elif "collect(DISTINCT n.canonical_key) AS huerfanos" in query:
             mock_result.single.return_value = {"huerfanos": ["n_aislado"]}
        elif "count(n) as orphans" in query:
             mock_result.single.return_value = {"orphans": 0}
        return mock_result

    mock_tx.run.side_effect = side_effect_tx_run

    provenance = Provenance("test", "driver1", "2026-07-23T12:00:00Z")
    # Hack the io_id explicitly
    object.__setattr__(provenance, "io_id", "io-aislado")

    triple = Triple(
        id="txx", origen_id="n_aislado", destino_id="n_aislado2", relacion="TEST",
        provenance=provenance, metadata={}, valid_at=provenance.timestamp,
        invalid_at=None, created_at=provenance.timestamp
    )

    import pytest
    from khora_kernel.motor._memoria import HuerfanosDetectadosError

    with pytest.raises(HuerfanosDetectadosError) as exc_info:
        memoria.escribir_ingesta([triple], provenance)

    assert exc_info.value.io_id == "io-aislado"
    assert "n_aislado" in exc_info.value.huerfanos

    # Verify rollback called, commit strictly not called
    mock_tx.rollback.assert_called_once()
    mock_tx.commit.assert_not_called()

"""

match_str = '''
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
        metadata={},
        valid_at=provenance.timestamp,
        invalid_at=None,
        created_at=provenance.timestamp
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
        metadata={},
        valid_at=provenance.timestamp,
        invalid_at=None,
        created_at=provenance.timestamp
    )

    escritos = memoria.escribir_ingesta([triple_reachable], provenance)
    assert escritos == 1

    # Verify 100% reachability from root
    with neo4j_driver.session() as session:
        res = session.run("MATCH (n) WHERE NOT (n:User AND n.id='root') AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) } RETURN count(n) as orphans")
        orphans = res.single()["orphans"]
        assert orphans == 0
'''

content = content.replace(match_str.strip("\n"), replacement.strip("\n"))

with open("kernel/src/khora_kernel/motor/tests/test_bitemporal_pkg.py", "w") as f:
    f.write(content)
