# @l0 L0-002-R · @req UA-03/REQ-1 · @acr ACR-1.1
import os
import sys
import re
import argparse
import requests
from requests.auth import HTTPBasicAuth

def get_db_api_url():
    # Aura HTTP API endpoint usually looks like https://<db-id>.databases.neo4j.io/db/neo4j/tx/commit
    uri = os.environ.get("NEO4J_URI", "")
    if not uri:
        # Fallback to local HTTP for testing if Aura not provided
        return "http://localhost:7474/db/neo4j/tx/commit"

    # Simple conversion from neo4j+s:// or bolt:// to https://
    # Only useful if URI is an Aura connection string
    if "databases.neo4j.io" in uri:
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "https://")
        elif uri.startswith("neo4j+ssc://"):
            uri = uri.replace("neo4j+ssc://", "https://")
        elif uri.startswith("bolt://"):
            uri = uri.replace("bolt://", "https://")
        # Ensure it points to tx endpoint
        if not uri.endswith("/db/neo4j/tx/commit"):
            uri = f"{uri.rstrip('/')}/db/neo4j/tx/commit"
        return uri

    return uri

def run_cypher_http(query, parameters=None):
    url = get_db_api_url()
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")

    payload = {
        "statements": [
            {
                "statement": query,
                "parameters": parameters or {}
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        response = requests.post(
            url,
            json=payload,
            auth=HTTPBasicAuth(user, password),
            headers=headers
        )

        if response.status_code not in (200, 201):
            print(f"Error HTTP {response.status_code}: {response.text}", file=sys.stderr)
            raise Exception(f"Fallo en la consulta HTTP a Neo4j: {response.status_code}")

        data = response.json()
        if "errors" in data and data["errors"]:
            print(f"Errores Cypher: {data['errors']}", file=sys.stderr)
            raise Exception(f"Fallo en la ejecución de Cypher: {data['errors']}")

        return data

    except requests.exceptions.RequestException as e:
        print(f"Error de conexión HTTP: {e}", file=sys.stderr)
        raise Exception(f"Fallo en la consulta HTTP a Neo4j: {e}")

# Reglas de validación para Literales
def es_literal(canonical_key: str) -> bool:
    if not canonical_key:
        return False

    # 1. Puramente numérico
    if re.match(r'^-?\d+(\.\d+)?$', canonical_key):
        return True

    # 2. Patrón de fecha español: D_de_MES_de_AAAA
    # Ej: 29_de_junio_de_1988
    if re.match(r'^\d{1,2}_de_[a-z]+_de_\d{4}$', canonical_key, re.IGNORECASE):
        return True

    # 3. Patrón de fecha ISO-8601 simple (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SSZ)
    if re.match(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?)?$', canonical_key):
        return True

    return False

def check_violaciones():
    print("Verificando violaciones estructurales...", file=sys.stderr)
    violaciones = []

    # Violación: Tripleta con cabeza :Literal
    query_cabeza_literal = """
    MATCH (h:Literal)-[r:RELATION]->(t)
    RETURN h.canonical_key AS cabeza, type(r) AS relacion, t.canonical_key AS cola
    """
    res = run_cypher_http(query_cabeza_literal)
    for row in res["results"][0]["data"]:
        c = row["row"][0]
        r = row["row"][1]
        t = row["row"][2]
        violaciones.append(f"VIOLACION: Literal '{c}' actúa como cabeza en relación '{r}' hacia '{t}'.")

    # Violación: Tripleta con root como cola
    query_root_cola = """
    MATCH (h)-[r]->(t:User {id: 'root'})
    RETURN coalesce(h.canonical_key, h.id, 'UNKNOWN') AS cabeza, type(r) AS relacion
    """
    res_root = run_cypher_http(query_root_cola)
    for row in res_root["results"][0]["data"]:
        c = row["row"][0]
        r = row["row"][1]
        violaciones.append(f"VIOLACION: Root es cola en relación '{r}' desde '{c}'.")

    return violaciones

def main():
    parser = argparse.ArgumentParser(description="Retrofit UA-03: Tipado disjunto (Entity, Literal, Blank) vía HTTP API.")
    parser.add_argument("--aplicar", action="store_true", help="Aplica los cambios en la base de datos (por defecto es dry-run).")
    args = parser.parse_args()

    dry_run = not args.aplicar

    print("Iniciando análisis para UA-03 (Tipado disjunto)...", file=sys.stderr)

    # Verificar si Neo4j Aura HTTP URL is provided or test is requested
    # Under test conditions without docker, we just simulate or fail explicitly
    if not os.environ.get("NEO4J_URI") and os.environ.get("CI_TESTING_NO_DB"):
        print("Ejecución en entorno sin Neo4j (simulación CI). Terminado.", file=sys.stderr)
        return

    # Verificar guardarraíles primero
    violaciones = check_violaciones()
    if violaciones:
        print("\n!!! ATENCIÓN: Se encontraron violaciones estructurales. Deben reportarse en el PR !!!", file=sys.stderr)
        for v in violaciones:
            print(f"  - {v}", file=sys.stderr)
        print("\nEl proceso continuará y reclasificará nodos, pero NO corregirá estas violaciones.\n", file=sys.stderr)


    # 1. Obtener candidatos a Literal: Nodos que NO son cabeza de ninguna :RELATION
    query_candidatos = """
    MATCH (n:Entity)
    WHERE NOT (n)-[:RELATION]->()
    RETURN n.canonical_key AS clave
    """

    print("Consultando candidatos...", file=sys.stderr)
    res_candidatos = run_cypher_http(query_candidatos)
    candidatos_raw = [row["row"][0] for row in res_candidatos["results"][0]["data"] if row["row"][0] is not None]

    # 2. Filtrar candidatos según whitelist de Literales
    literales_a_etiquetar = []
    for c in candidatos_raw:
        if es_literal(c):
            literales_a_etiquetar.append(c)

    if not literales_a_etiquetar:
        print("No se encontraron nodos para clasificar como Literal.", file=sys.stderr)
        if dry_run:
            print("Terminado (Dry-run).")
            return
        else:
            # Fallo ruidoso o no hay entrega como pide la tarea
            print("ERROR: Cero escrituras propuestas. Abortando por política estricta.", file=sys.stderr)
            sys.exit(1)

    print(f"Encontrados {len(literales_a_etiquetar)} nodos que serán etiquetados como :Literal:", file=sys.stderr)
    for literal_cand in literales_a_etiquetar:
        print(f"  - {literal_cand}", file=sys.stderr)

    if dry_run:
        print("\nModo Dry-run. Usa --aplicar para ejecutar SET en Neo4j.", file=sys.stderr)
        return

    print("\nAplicando etiquetas...", file=sys.stderr)

    # 3. Aplicar etiquetas SET de forma aditiva
    query_aplicar = """
    UNWIND $claves AS clave
    MATCH (n:Entity {canonical_key: clave})
    SET n:Literal
    RETURN count(n) AS modificados
    """

    res_aplicar = run_cypher_http(query_aplicar, {"claves": literales_a_etiquetar})
    modificados = res_aplicar["results"][0]["data"][0]["row"][0]

    print(f"Actualización completada. Nodos etiquetados como :Literal: {modificados}", file=sys.stderr)

if __name__ == "__main__":
    main()
