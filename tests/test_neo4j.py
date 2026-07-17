import os
import hashlib
import json
import pytest
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

@pytest.fixture(scope="module")
def neo4j_driver():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    yield driver
    driver.close()

def test_c1_neo4j_connection(neo4j_driver):
    """
    Test C1: Verifica la conexión a Neo4j, crea un nodo TestNode y lo lee.
    """
    with neo4j_driver.session() as session:
        # Create test node
        session.run("MERGE (t:TestNode {id: 'ping'})")

        # Read it back
        result = session.run("MATCH (t:TestNode {id: 'ping'}) RETURN t.id AS id")
        record = result.single()

        assert record is not None
        assert record["id"] == "ping"

def test_c2_frozen_contract_schema(neo4j_driver):
    """
    Test C2 (Frozen Contract): Serializa la lista de constraints y valida el hash.
    Hash inicial documentado: '517df4da378943fcf3e618ce528148b59d9c15d86214fb9fc1529d20c54170ad'
    (Puede variar dependiendo de Neo4j y la versión, ajustar si falla en CI al inicio)
    """
    with neo4j_driver.session() as session:
        result = session.run("SHOW CONSTRAINTS")
        constraints = []
        for record in result:
            # We sort keys to make it deterministic
            record_dict = dict(record)

            # Neo4j 5 returns 'labelsOrTypes', 'properties', 'type', etc.
            # We extract just the meaningful ones to make it robust
            relevant_data = {
                "name": record_dict.get("name"),
                "type": record_dict.get("type"),
                "entityType": record_dict.get("entityType"),
                "labelsOrTypes": sorted(record_dict.get("labelsOrTypes", [])),
                "properties": sorted(record_dict.get("properties", []))
            }
            constraints.append(relevant_data)

        # Sort constraints by name for deterministic hashing
        constraints.sort(key=lambda x: x.get("name", ""))

        serialized_constraints = json.dumps(constraints, sort_keys=True)
        current_hash = hashlib.sha256(serialized_constraints.encode('utf-8')).hexdigest()

        # We need to compute the initial hash. To do so, we might print it or assert it.
        # This assert acts as the frozen contract.
        # If it's the first time running, we might need to adjust the expected hash.
        expected_hash = "13adb72bd6993741b6a20b54f5450bd7de273f4c347427dded95f9e462650774"

        # Uncomment and run locally to get the hash for the first time if needed:
        # print("CURRENT HASH:", current_hash)
        # expected_hash = current_hash

        assert current_hash == expected_hash, f"Schema constraint hash changed! Expected {expected_hash}, got {current_hash}"

def test_c2_reachability(neo4j_driver):
    """
    Test C2 (Reachability): Crea un triple desde `u` (User) hasta un nodo de prueba y verifica el camino.
    """
    with neo4j_driver.session() as session:
        # 1. Aseguramos que el nodo User existe (fue creado por el seed script)
        result = session.run("MATCH (u:User {id: 'black-sheep'}) RETURN u.id AS id")
        record = result.single()
        assert record is not None, "Root node User 'black-sheep' was not seeded."

        # 2. Creamos un nodo de prueba y la relación :TRIPLE desde el User root
        test_node_id = "test-reach-node"
        session.run("""
            MATCH (u:User {id: 'black-sheep'})
            MERGE (t:Entity {id: $test_node_id})
            MERGE (u)-[r:TRIPLE {relation: 'has_note'}]->(t)
        """, test_node_id=test_node_id)

        # 3. Verificamos que existe un camino de `u` a `t`
        result = session.run("""
            MATCH p = (u:User {id: 'black-sheep'})-[:TRIPLE*]->(t:Entity {id: $test_node_id})
            RETURN nodes(p) AS path_nodes
        """, test_node_id=test_node_id)

        paths = list(result)
        assert len(paths) > 0, "No path found from User root to the test node."

        path_nodes = paths[0]["path_nodes"]
        assert len(path_nodes) >= 2

        # Cleanup test node for reachability
        session.run("MATCH (t:Entity {id: $test_node_id}) DETACH DELETE t", test_node_id=test_node_id)
