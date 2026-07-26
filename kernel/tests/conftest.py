# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os

import pytest


@pytest.fixture(scope="session")
def neo4j_config():
    return {
        "uri": os.environ.get("NEO4J_URI", "bolt://localhost:7687"),
        "user": os.environ.get("NEO4J_USER", "neo4j"),
        "password": os.environ.get("NEO4J_PASSWORD", "password")
    }
