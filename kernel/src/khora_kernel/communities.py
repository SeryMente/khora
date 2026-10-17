# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1 · @ua UA-10,UA-11,UA-12,UA-13,UA-46,UA-47,UA-48,UA-49,UA-50,UA-51,UA-56,UA-57
import hashlib
import json
import logging
import os
from importlib.metadata import version as package_version
from pathlib import Path
from typing import Dict, List

import igraph as ig
import leidenalg
import networkx as nx

KHORA_LEIDEN_GAMMA = float(os.getenv("KHORA_LEIDEN_GAMMA", "0.05"))
KHORA_LEIDEN_THETA = float(os.getenv("KHORA_LEIDEN_THETA", "0.01"))
KHORA_LEIDEN_SEED = int(os.getenv("KHORA_LEIDEN_SEED", "42"))
KHORA_LEIDEN_MAX_SIZE = int(os.getenv("KHORA_LEIDEN_MAX_SIZE", "0"))
MANIFEST_DIR = Path(os.getenv("KHORA_LEIDEN_MANIFEST_DIR", "data/epistwin"))


class ComunidadesReificadas:
    def __init__(self) -> None:
        self.estructura: Dict[str, Dict] = {}
        self.cypher_queries: List[Dict] = []

    def add_community(
        self, cid: str, level: int, gamma: float, theta: float,
        parent_cid: str = None, miembros: List[str] = None,
    ) -> None:
        miembros = sorted(set(miembros or []))
        fingerprint = hashlib.sha256(
            json.dumps(miembros, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        self.estructura[cid] = {
            "level": level, "gamma": gamma, "theta": theta,
            "parent": parent_cid, "miembros": miembros,
            "member_fingerprint": fingerprint,
        }
        self.cypher_queries.append({
            "type": "Community",
            "query": "CREATE (c:Community {community_id:$cid})",
            "params": {
                "cid": cid, "level": level, "gamma": gamma,
                "theta": theta, "member_fingerprint": fingerprint,
            },
        })
        for member in miembros:
            self.cypher_queries.append({
                "type": "Member",
                "query": "MATCH (e:Entity {canonical_key:$entity_id}) "
                         "CREATE (e)-[:IN_COMMUNITY]->(c)",
                "params": {"entity_id": member, "community_id": cid},
            })


def _semantic_projection(memoria_grafo) -> tuple[nx.Graph, dict]:
    G = nx.Graph()
    if not getattr(memoria_grafo, "_driver", None):
        return G, _manifest(G)

    nodes_query = """
    MATCH (n:Entity)
    WHERE n.invalid_at IS NULL
      AND NOT n:User
      AND NOT n:InformationObject
    RETURN DISTINCT coalesce(n.id, n.canonical_key) AS node_id
    """
    edge_query = """
    MATCH (a:Entity)-[r:RELATION]->(b:Entity)
    WHERE a.invalid_at IS NULL AND b.invalid_at IS NULL AND r.invalid_at IS NULL
      AND NOT a:User AND NOT b:User
      AND NOT a:InformationObject AND NOT b:InformationObject
    RETURN coalesce(a.id, a.canonical_key) AS source,
           coalesce(b.id, b.canonical_key) AS target,
           1.0 AS weight
    """
    try:
        with memoria_grafo._driver.session() as session:
            for rec in session.run(nodes_query):
                if rec["node_id"]:
                    G.add_node(rec["node_id"])
            for rec in session.run(edge_query):
                a, b = rec["source"], rec["target"]
                if a and b:
                    if G.has_edge(a, b):
                        G[a][b]["weight"] += float(rec["weight"] or 1.0)
                    else:
                        G.add_edge(a, b, weight=float(rec["weight"] or 1.0))
    except Exception as exc:
        logging.error("[LEIDEN] fallo de proyección: %s", exc)
        raise
    return G, _manifest(G)


def _manifest(G: nx.Graph) -> dict:
    nodes = sorted(str(n) for n in G.nodes())
    edges = sorted(
        (*sorted((str(a), str(b))), float(d.get("weight", 1.0)))
        for a, b, d in G.edges(data=True)
    )
    canonical = {
        "node_ids": nodes, "edges": edges,
        "node_class": "Entity",
        "edge_class": "RELATION",
        "direction": "undirected_projection",
        "weights": "count_per_semantic_edge",
        "literals_in_projection": False,
        "information_objects_in_projection": False,
    }
    revision = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return {
        "graph_revision": revision,
        "projection": canonical,
        "vertex_count": len(nodes),
        "edge_count": len(edges),
    }


def extraer_subgrafo(memoria_grafo) -> nx.Graph:
    G, _ = _semantic_projection(memoria_grafo)
    return G


def nx_to_igraph(G: nx.Graph) -> tuple[ig.Graph, list]:
    names = sorted(G.nodes())
    g = ig.Graph(n=len(names), directed=False)
    g.vs["name"] = names
    index = {name: i for i, name in enumerate(names)}
    edges, weights = [], []
    for a, b, data in G.edges(data=True):
        edges.append((index[a], index[b]))
        weights.append(float(data.get("weight", 1.0)))
    if edges:
        g.add_edges(edges)
        g.es["weight"] = weights
    return g, names


def _stable_cid(level: int, parent: str | None, members: List[str]) -> str:
    payload = {"level": level, "parent": parent or "", "members": sorted(members)}
    fp = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return f"L{level}_{fp[:24]}"


def _connected_parts(subgraph: nx.Graph, members: List[str]) -> List[List[str]]:
    induced = subgraph.subgraph(members)
    return [sorted(part) for part in nx.connected_components(induced)]


def jerarquia_leiden(
    G: nx.Graph,
    max_size: int = KHORA_LEIDEN_MAX_SIZE,
    gamma: float = KHORA_LEIDEN_GAMMA,
    theta: float = KHORA_LEIDEN_THETA,
    seed: int = KHORA_LEIDEN_SEED,
) -> ComunidadesReificadas:
    reificadas = ComunidadesReificadas()
    if not G:
        return reificadas

    def rec(subgraph: nx.Graph, level: int, parent: str | None) -> None:
        if subgraph.number_of_nodes() == 0:
            return
        g, names = nx_to_igraph(subgraph)
        if g.vcount() == 1:
            groups = [[0]]
        else:
            optimiser = leidenalg.Optimiser()
            optimiser.set_rng_seed(seed)
            partition = leidenalg.ModularityVertexPartition(g, weights="weight")
            optimiser.optimise_partition(partition)
            groups = [list(group) for group in partition]

        for group in groups:
            members = [names[i] for i in group]
            for component in _connected_parts(subgraph, members):
                cid = _stable_cid(level, parent, component)
                reificadas.add_community(cid, level, gamma, theta, parent, component)
                if max_size and len(component) > max_size and len(component) < subgraph.number_of_nodes():
                    rec(subgraph.subgraph(component).copy(), level + 1, cid)

    rec(G.copy(), 0, None)
    return reificadas


def _validate_partition(G: nx.Graph, comunidades: ComunidadesReificadas) -> dict:
    eligible = set(G.nodes())
    covered: List[str] = []
    connected = True
    duplicate = False
    sizes = {}
    for cid, info in comunidades.estructura.items():
        members = set(info["miembros"])
        sizes[cid] = len(members)
        covered.extend(members)
        connected &= nx.is_connected(G.subgraph(members)) if members else True
    duplicate = len(covered) != len(set(covered))
    return {
        "eligible_nodes": len(eligible),
        "covered_nodes": len(set(covered)),
        "coverage_ok": set(covered) == eligible,
        "duplicate_members": duplicate,
        "connected_communities": connected,
        "community_count": len(comunidades.estructura),
        "community_sizes": sizes,
        "isolated_nodes": sorted(n for n in G.nodes() if G.degree(n) == 0),
    }


def _write_manifest(manifest: dict) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    revision = manifest["graph_revision"]
    path = MANIFEST_DIR / f"leiden-{revision}.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (MANIFEST_DIR / "leiden-latest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# Unify the causal revision used by memory and the Leiden manifest.
def _recalcular_leiden_canonico(io_id: str, memoria_grafo, ts: str) -> dict:
    G, manifest = _semantic_projection(memoria_grafo)
    projection_revision = manifest["graph_revision"]
    reificadas = jerarquia_leiden(G)
    integrity = _validate_partition(G, reificadas)
    graph_revision = (
        memoria_grafo.get_graph_revision()
        if hasattr(memoria_grafo, "get_graph_revision")
        else projection_revision
    )
    manifest["graph_revision"] = graph_revision
    manifest["projection"]["projection_revision"] = projection_revision
    manifest.update({
        "accepted_update_id": io_id,
        "run_timestamp": ts,
        "algorithm": {
            "implementation": "leidenalg",
            "version": package_version("leidenalg"),
            "objective": "modularity_Q",
            "resolution": "not_used_for_ModularityVertexPartition",
            "gamma_recorded": KHORA_LEIDEN_GAMMA,
            "theta_effective": False,
            "seed": KHORA_LEIDEN_SEED,
            "weights": "weight",
            "directed": False,
            "isolated_node_policy": "retain_as_singleton",
        },
        "integrity": integrity,
        "communities": [
            {
                "community_id": cid,
                "level": info["level"],
                "parent": info["parent"],
                "member_fingerprint": info["member_fingerprint"],
                "members": info["miembros"],
            }
            for cid, info in sorted(reificadas.estructura.items())
        ],
    })
    if not integrity["coverage_ok"] or integrity["duplicate_members"] or not integrity["connected_communities"]:
        raise RuntimeError(f"Invalid community partition: {integrity}")
    if hasattr(memoria_grafo, "reificar_comunidades"):
        memoria_grafo.reificar_comunidades(
            reificadas,
            io_id,
            ts,
            graph_revision=graph_revision,
        )
    _write_manifest(manifest)
    logging.info(
        "[LEIDEN] revision=%s update=%s communities=%s nodes=%s edges=%s",
        graph_revision,
        io_id,
        integrity["community_count"],
        manifest["vertex_count"],
        manifest["edge_count"],
    )
    return manifest

recalcular_leiden = _recalcular_leiden_canonico
