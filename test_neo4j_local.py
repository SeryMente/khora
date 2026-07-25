import pytest
from neo4j import GraphDatabase
import os
from testcontainers.neo4j import Neo4jContainer

@pytest.fixture(scope="session")
def neo4j_container():
    with Neo4jContainer() as neo4j:
        yield neo4j

@pytest.fixture(scope="session")
def neo4j_config(neo4j_container):
    return {
        "uri": neo4j_container.get_connection_url(),
        "user": neo4j_container.NEO4J_USER,
        "password": neo4j_container.NEO4J_ADMIN_PASSWORD,
    }

@pytest.fixture(scope="module")
def neo4j_driver(neo4j_config):
    driver = GraphDatabase.driver(neo4j_config["uri"], auth=(neo4j_config["user"], neo4j_config["password"]))
    yield driver
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()

def test_connection(neo4j_driver):
    with neo4j_driver.session() as session:
        result = session.run("RETURN 1 as num")
        assert result.single()["num"] == 1
