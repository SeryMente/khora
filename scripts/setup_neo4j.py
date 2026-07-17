import os
import time
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def wait_for_neo4j(driver, timeout=60):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with driver.session() as session:
                session.run("RETURN 1")
            print("Neo4j is ready!")
            return True
        except ServiceUnavailable:
            print("Waiting for Neo4j to be ready...")
            time.sleep(2)
        except Exception as e:
            print(f"Waiting for Neo4j to be ready... ({e})")
            time.sleep(2)
    print("Timeout waiting for Neo4j!")
    return False

def setup_schema_and_seed(driver):
    with driver.session() as session:
        # Constraint UNIQUE en Entity.id
        session.run("CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE")

        # En la capa de DB Graph (Neo4j), la unicidad de raíz (solo puede existir 1 User)
        # La simulamos asegurando que la ID del User sea única (como Entity ya tiene id unico, User lo hereda lógicamente
        # pero es mejor forzar la clave si querés, o crear el nodo de semilla directamente).
        # Agregamos constraint adicional para :User por si acaso
        session.run("CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")

        # Constraint para :BlankNode por consistencia
        session.run("CREATE CONSTRAINT blank_node_id_unique IF NOT EXISTS FOR (b:BlankNode) REQUIRE b.id IS UNIQUE")

        # Seed the User root node
        session.run("""
            MERGE (u:User {id: 'black-sheep'})
            ON CREATE SET u:Entity, u.label = 'User Root', u.type = 'User', u.created_at = datetime().epochMillis, u.source_σ = 'system'
        """)

        print("Schema constraints created and seed node initialized.")

def main():
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    if wait_for_neo4j(driver):
        setup_schema_and_seed(driver)
        driver.close()
        print("Setup completed successfully.")
        exit(0)
    else:
        driver.close()
        print("Failed to connect to Neo4j.")
        exit(1)

if __name__ == "__main__":
    main()
