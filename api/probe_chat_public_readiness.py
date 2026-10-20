"""Opt-in, read-only ENT01 diagnostic. No notes, graph writes or index rebuild.

Runs only in the existing service's build environment. Credentials remain there.
Output is a bounded metadata report, never a vector, source text or exception.
This is not an end-to-end acceptance test.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from neo4j import GraphDatabase

from khora_kernel import embeddings as em


def inspect_public_metadata(driver, technical_ids):
    # Aggregate metadata only: deliberately no labels/text/summary/provenance
    # values are returned and no all-node/revision helper reads source text.
    with driver.session(default_access_mode="READ") as session:
        row = session.run("""
            MATCH (n)
            WHERE n.invalid_at IS NULL
              AND any(label IN labels(n) WHERE label IN ['Entity','Literal','Blank'])
              AND NOT n:User AND NOT n:InformationObject AND NOT n:Community
            RETURN count(n) AS active_semantic_nodes,
              sum(CASE WHEN n.visibilidad = 'transparente' THEN 1 ELSE 0 END)
                AS explicitly_public_nodes,
              sum(CASE WHEN n.visibilidad = 'transparente'
                AND n.canonical_key IN $ids THEN 1 ELSE 0 END)
                AS public_technical_id_matches
        """, ids=technical_ids).single()
        return {key: int(row[key] or 0) for key in (
            "active_semantic_nodes", "explicitly_public_nodes",
            "public_technical_id_matches",
        )}


def main():
    report = {"scope": "read_only_metadata_and_artificial_provider_probe",
              "notes_read": False, "graph_writes": False, "index_rebuilt": False}
    try:
        ids = json.loads(Path("data/faiss_pkg_map.json").read_text())
        with GraphDatabase.driver(os.environ["NEO4J_URI"], auth=(
                os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"])) as driver:
            report["graph"] = inspect_public_metadata(driver, ids)
    except Exception:
        report["graph_error"] = "METADATA_UNAVAILABLE"
    try:
        with em.require_semantic_embeddings():
            vector = em.embed_text("Public artificial ENT01 test: Lumen is a fictional amber beacon.")
            report["provider"] = {"verified": True, "dimension": len(vector)}
            meta = em._read_meta()
            report["index"] = {
                "metadata_present": bool(meta),
                "space_matches": meta.get("embedding_space_sha256") == em._embedding_space_id(),
                "graph_revision_present": bool(meta.get("graph_revision")),
                "artifacts_sealed": bool(meta.get("artifacts_sha256")),
            }
    except Exception:
        report["provider"] = {"verified": False, "error": "SEMANTIC_PROVIDER_UNVERIFIED"}
    print("KHORA_CHAT_PUBLIC_READINESS " + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()