# @l0 L0-002 · @req PKG-00/REQ-1 · @acr ACR-1.1
# @ua UA-01, UA-02, UA-03, UA-04
import os

import pytest


@pytest.fixture(scope="session")
def neo4j_config():
    # Use existing CI infrastructure (docker compose up -d via ci.yml and setup_neo4j.py)
    # The setup_neo4j.py sets these environment variables
    # If we are local, default to local neo4j
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")

    return {
        "uri": uri,
        "user": user,
        "password": password
    }
