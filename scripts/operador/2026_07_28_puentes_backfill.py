# @l0 L0-002-R · @req GRAFO-01/REQ-1 · @acr ACR-3.1 · @ua UA-08,UA-25,UA-30
import os
import argparse
from neo4j import GraphDatabase
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("puentes_backfill")

# Reglas duras y deducciones simples para el operador basadas en los hallazgos
REGLAS_EQUIVALENCIA = [
    ("yo", "operador"),
    ("operador", "victor_hugo_torres"),
    ("pkg", "el_grafo_pkg"),
    ("sistema_de_memoria_continua", "la_memoria_continua_del_operador"),
    ("memoria_continua_del_operador_matiz_sistema_de_memoria_continua", "sistema_de_memoria_continua")
]

# Nodos mal formados extraídos que son verbos conjugados u otras extracciones dudosas
NODOS_SOSPECHOSOS = [
    "naci", "nacido", "creo", "construida", "esta"
]

def backfill(uri, user, password):
    driver = GraphDatabase.driver(uri, auth=(user, password))

    with driver.session() as session:
        # 1. Unificación (creación de vínculos ES_EQUIVALENTE_A)
        # R3: Todo vínculo reversible y trazable
        ts = "2026-07-28T00:00:00Z"
        evidencia = "Reglas de operador EpisTwin (Backfill 2026-07-28)"

        for origen, destino in REGLAS_EQUIVALENCIA:
            logger.info(f"Procesando equivalencia: {origen} -> {destino}")
            session.run("""
            MATCH (n1:Entity {canonical_key: $origen}), (n2:Entity {canonical_key: $destino})
            MERGE (n1)-[r:ES_EQUIVALENTE_A]->(n2)
            ON CREATE SET
                r.confianza = 1.0,
                r.evidencia = $evidencia,
                r.created_at = datetime($ts),
                r.valid_at = datetime($ts),
                r.invalid_at = null
            """, origen=origen, destino=destino, evidencia=evidencia, ts=ts)

        # 2. Marcado de verbos conjugados sospechosos
        # R7: Se marcan, no se borran. Usamos nodo de anotación
        for sospechoso in NODOS_SOSPECHOSOS:
            session.run("""
            MATCH (n:Entity {canonical_key: $sospechoso})
            MERGE (a:Annotation {tipo: 'REVISION', motivo: 'VERBO_CONJUGADO', evidencia: $evidencia})
            ON CREATE SET a.timestamp = datetime($ts)
            MERGE (n)-[r:MARCADO_COMO]->(a)
            ON CREATE SET
                r.created_at = datetime($ts),
                r.valid_at = datetime($ts),
                r.invalid_at = null
            """, sospechoso=sospechoso, evidencia=evidencia, ts=ts)

        # 3. Predicados compuestos
        # R6: Los predicados compuestos se marcan como tales para revisión, sin partirlos.
        # "nació el 29 de junio de 1988" -> buscar aristas con espacios/fechas.
        # Las aristas se guardan con el tipo definido por el modelo en Cypher, ej type(r).
        # Match genérico: [r]
        session.run("""
        MATCH (o)-[r]->(d)
        WHERE type(r) CONTAINS ' ' OR type(r) CONTAINS 'el_' OR size(type(r)) > 30
        MERGE (a:Annotation {tipo: 'REVISION', motivo: 'PREDICADO_COMPUESTO', evidencia: $evidencia})
        ON CREATE SET a.timestamp = datetime($ts)
        MERGE (o)-[m:MARCADO_COMO_PREDICADO_COMPUESTO {rel_type: type(r)}]->(a)
        ON CREATE SET
            m.created_at = datetime($ts),
            m.valid_at = datetime($ts),
            m.invalid_at = null
        """, evidencia=evidencia, ts=ts)

    driver.close()
    logger.info("Backfill de puentes completado exitosamente.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill para deducción de puentes de equivalencia")
    parser.add_argument("--uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--user", default=os.getenv("NEO4J_USER", "neo4j"))
    parser.add_argument("--password", default=os.getenv("NEO4J_PASSWORD", "password"))
    args = parser.parse_args()

    backfill(args.uri, args.user, args.password)
