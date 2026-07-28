# @l0 L0-002-R · @req GRAFO-01-BACKFILL/REQ-1 · @acr ACR-1.1
import os
import sys
import argparse
from neo4j import GraphDatabase

def get_db_uri():
    uri = os.environ.get("NEO4J_URI", "neo4j://localhost:7687")
    if ".databases.neo4j.io" in uri:
        if not (uri.startswith("neo4j+s://") or uri.startswith("neo4j+ssc://")):
            if uri.startswith("neo4j://"):
                uri = uri.replace("neo4j://", "neo4j+s://", 1)
            elif uri.startswith("bolt://"):
                uri = uri.replace("bolt://", "neo4j+s://", 1)
            else:
                uri = f"neo4j+s://{uri}"
    return uri

def get_driver():
    uri = get_db_uri()
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    return GraphDatabase.driver(uri, auth=(user, password))

QUERY_ORPHANS = """
MATCH (n:Entity)
WHERE 1=1
AND NOT (n:User AND n.id = 'root')
AND NOT (n:InformationObject)
AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
RETURN n.canonical_key AS clave,
coalesce(n.label_original, n.canonical_key) AS etiqueta,
toString(coalesce(n.valid_at, n.created_at)) AS ts,
n.provenance AS provenance
ORDER BY clave
"""

QUERY_RELATION_COUNT = "MATCH ()-[r:RELATION]->() RETURN count(r) AS c"
QUERY_ROOT_COUNT = "MATCH (u:User {id:'root'}) RETURN count(u) AS c"

def derive_io_id(provenance_list):
    if provenance_list and isinstance(provenance_list, list):
        for prov in provenance_list:
            if isinstance(prov, str) and "io_id=" in prov:
                parts = prov.split("io_id=")
                if len(parts) > 1:
                    value_part = parts[1]
                    io_id = value_part.split(",")[0].strip()
                    return io_id
    return "legacy-2026-07-28"

def main():
    parser = argparse.ArgumentParser(description="Backfill legay reachability for orphan nodes.")
    parser.add_argument("--aplicar", action="store_true", help="Apply changes. Defaults to dry-run.")
    args = parser.parse_args()

    dry_run = not args.aplicar

    driver = get_driver()

    with driver.session() as session:
        # Pre-checks
        res_rel = session.run(QUERY_RELATION_COUNT).single()
        res_root = session.run(QUERY_ROOT_COUNT).single()

        print(f"Pre-check :RELATION count: {res_rel['c']}")
        print(f"Pre-check Root count: {res_root['c']}")

        orphans = session.run(QUERY_ORPHANS).data()

        print(f"Found {len(orphans)} orphaned entities.")

        groups = {}
        for orphan in orphans:
            clave = orphan["clave"]
            etiqueta = orphan["etiqueta"]
            ts = orphan["ts"]
            if not ts:
                ts = "2026-07-28T00:00:00Z"

            provenance = orphan["provenance"]
            io_id = derive_io_id(provenance)

            print(f"Orphan: clave='{clave}', etiqueta='{etiqueta}', ts='{ts}', io_id='{io_id}' (fallback={io_id == 'legacy-2026-07-28'})")

            if io_id not in groups:
                groups[io_id] = []

            groups[io_id].append({
                "clave": clave,
                "ts": ts
            })

        if not dry_run:
            print("Applying changes...")
            for io_id, entities in groups.items():
                io_key = f"io:{io_id}"

                # Determine fallback timestamp for the IO if none is given, we use the timestamp of the first entity as base or default
                io_ts = entities[0]["ts"]

                query_merge = """
                MATCH (u:User {id: 'root'})
                MERGE (io:Entity:InformationObject {canonical_key: $io_key})
                ON CREATE SET io.io_id = $io_id,
                io.label_original = 'Volcado ' + $io_id,
                io.provenance = ['origen=backfill, driver=grafo-01, io_id=' + $io_id],
                io.created_at = datetime($io_ts),
                io.valid_at = datetime($io_ts),
                io.invalid_at = null
                MERGE (u)-[ow:OWNS]->(io)
                ON CREATE SET ow.created_at = datetime($io_ts),
                ow.valid_at = datetime($io_ts),
                ow.invalid_at = null
                WITH io
                UNWIND $entities AS item
                MATCH (e:Entity {canonical_key: item.clave})
                SET e.created_at = coalesce(e.created_at, datetime(item.ts)),
                    e.valid_at = coalesce(e.valid_at, datetime(item.ts))
                MERGE (io)-[m:MENTIONS]->(e)
                ON CREATE SET m.created_at = datetime(item.ts),
                m.valid_at = datetime(item.ts),
                m.invalid_at = null
                """

                session.run(query_merge, io_key=io_key, io_id=io_id, io_ts=io_ts, entities=entities)
            print("Changes applied.")
        else:
            print("Dry-run mode, no changes applied. Use --aplicar to run.")

        # Post-checks
        res_rel_post = session.run(QUERY_RELATION_COUNT).single()
        res_root_post = session.run(QUERY_ROOT_COUNT).single()

        print(f"Post-check :RELATION count: {res_rel_post['c']}")
        print(f"Post-check Root count: {res_root_post['c']}")

        orphans_remaining = session.run(QUERY_ORPHANS).data()
        print(f"Remaining orphans: {len(orphans_remaining)}")

        if len(orphans_remaining) > 0:
            print("Error: Orphans still exist.")
            sys.exit(1)

    driver.close()

if __name__ == "__main__":
    main()
