from __future__ import annotations

import os
import time

from neo4j import GraphDatabase

DEFAULT_URI = "bolt://localhost:7687"
DEFAULT_USER = "neo4j"
DEFAULT_PASSWORD = "neo4jpassword"
STARTUP_TIMEOUT_SECONDS = 60
POLL_SECONDS = 2

CONSTRAINTS = (
    "CREATE CONSTRAINT entity_canonical_key IF NOT EXISTS "
    "FOR (e:Entity) REQUIRE e.canonical_key IS UNIQUE",
    "CREATE CONSTRAINT information_object_io_id IF NOT EXISTS "
    "FOR (io:InformationObject) REQUIRE io.io_id IS UNIQUE",
    "CREATE CONSTRAINT information_object_canonical_key IF NOT EXISTS "
    "FOR (io:InformationObject) REQUIRE io.canonical_key IS UNIQUE",
    "CREATE CONSTRAINT community_identity IF NOT EXISTS "
    "FOR (c:Community) REQUIRE (c.community_id, c.graph_revision) IS UNIQUE",
    "CREATE CONSTRAINT user_id IF NOT EXISTS "
    "FOR (u:User) REQUIRE u.id IS UNIQUE",
)


def _connect():
    uri = os.environ.get("NEO4J_URI", DEFAULT_URI)
    user = os.environ.get("NEO4J_USER", DEFAULT_USER)
    password = os.environ.get("NEO4J_PASSWORD", DEFAULT_PASSWORD)
    return GraphDatabase.driver(uri, auth=(user, password))


def main() -> None:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    last_error: Exception | None = None

    while time.monotonic() < deadline:
        driver = None
        try:
            driver = _connect()
            driver.verify_connectivity()
            with driver.session() as session:
                session.run("RETURN 1 AS ok").single()
                for statement in CONSTRAINTS:
                    session.run(statement).consume()
                session.run(
                    "MATCH (n) RETURN count(n) AS node_count"
                ).single()
            print("Neo4j runtime reachable and schema initialized.")
            return
        except Exception as exc:
            last_error = exc
            time.sleep(POLL_SECONDS)
        finally:
            if driver is not None:
                driver.close()

    raise RuntimeError(
        f"Neo4j did not become ready within {STARTUP_TIMEOUT_SECONDS}s: {last_error}"
    )


if __name__ == "__main__":
    main()
