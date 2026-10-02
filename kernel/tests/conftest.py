# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os

import pytest
from neo4j import GraphDatabase
from testcontainers.community.neo4j import Neo4jContainer

os.environ.setdefault("KHORA_TEST_MODE", "1")


@pytest.fixture(scope="session")
def neo4j_container():
    external_uri = os.environ.get("NEO4J_URI")
    if external_uri:
        yield None
        return

    os.environ["TESTCONTAINERS_RYUK_DISABLED"] = "true"
    try:
        container = Neo4jContainer("neo4j:5.23.0")
        container.with_env("NEO4J_AUTH", "neo4j/password")
        with container as started:
            yield started
    except Exception as exc:
        pytest.skip(f"Neo4j/Testcontainers no disponible: {exc}")


@pytest.fixture(scope="session")
def neo4j_config(neo4j_container):
    if neo4j_container is not None:
        uri = neo4j_container.get_connection_url()
        user = "neo4j"
        password = "password"
    else:
        uri = os.environ["NEO4J_URI"]
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "password")

    driver = GraphDatabase.driver(uri, auth=(user, password))
    try:
        with driver.session() as session:
            session.run("RETURN 1").consume()
    except Exception as exc:
        driver.close()
        pytest.skip(f"Neo4j no accesible: {exc}")
    driver.close()

    return {"uri": uri, "user": user, "password": password}
