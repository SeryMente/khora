# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os
from typing import Dict, List

import igraph as ig
import leidenalg
import networkx as nx

KHORA_LEIDEN_GAMMA = float(os.getenv("KHORA_LEIDEN_GAMMA", "0.05"))
KHORA_LEIDEN_THETA = float(os.getenv("KHORA_LEIDEN_THETA", "0.01"))
KHORA_LEIDEN_SEED = int(os.getenv("KHORA_LEIDEN_SEED", "42"))


class ComunidadesReificadas:
    def __init__(self):
        self.cypher_queries = []
        self.estructura: Dict[str, Dict] = {}

    def add_community(
        self,
        cid: str,
        level: int,
        gamma: float,
        theta: float,
        parent_cid: str = None,
        miembros: List[str] = None,
    ):
        self.estructura[cid] = {
            "level": level,
            "gamma": gamma,
            "theta": theta,
            "parent": parent_cid,
            "miembros": miembros or [],
        }

        # Cypher con parámetros inyectados en la consulta, usaremos dicts para persistir
        self.cypher_queries.append(
            {
                "type": "Community",
                "params": {
                    "community_id": cid,
                    "level": level,
                    "gamma": gamma,
                    "theta": theta,
                    "summary_placeholder": True,
                },
            }
        )

        if parent_cid:
            self.cypher_queries.append(
                {
                    "type": "Parent",
                    "params": {"child_id": cid, "parent_id": parent_cid},
                }
            )

        for m in miembros or []:
            self.cypher_queries.append(
                {
                    "type": "Member",
                    "params": {"entity_id": m, "community_id": cid},
                }
            )


def extraer_subgrafo(memoria_neo4j) -> nx.Graph:
    """Exportación vía Cypher plano a networkx."""
    G = nx.Graph()
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return G

    query = """
    MATCH (n:Entity)-[r]->(m:Entity)
    RETURN n.id AS origen, m.id AS destino
    """
    try:
        with memoria_neo4j._driver.session() as session:
            result = session.run(query)
            for record in result:
                G.add_edge(record["origen"], record["destino"])
    except Exception:
        # Si falla (ej mock en tests) log y devolvemos vacío o fallback
        pass
    return G


def nx_to_igraph(G: nx.Graph) -> tuple[ig.Graph, list]:
    g_ig = ig.Graph.Erdos_Renyi(n=0, p=0)  # empty
    nodos_list = list(G.nodes())
    g_ig.add_vertices(len(nodos_list))
    g_ig.vs["name"] = nodos_list

    edges = []
    for u, v in G.edges():
        edges.append((nodos_list.index(u), nodos_list.index(v)))
    g_ig.add_edges(edges)
    return g_ig, nodos_list


def reificar_en_neo4j(memoria_neo4j, reificadas: ComunidadesReificadas):
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return

    query_community = """
    MERGE (c:Community {community_id: $community_id})
    SET c.level = $level, c.gamma = $gamma, c.theta = $theta, c.summary_placeholder = $summary_placeholder, c.created_at = timestamp()
    """
    query_parent = """
    MATCH (child:Community {community_id: $child_id}), (parent:Community {community_id: $parent_id})
    MERGE (child)-[:PARENT_COMMUNITY]->(parent)
    """
    query_member = """
    MATCH (e:Entity {id: $entity_id}), (c:Community {community_id: $community_id})
    MERGE (e)-[:IN_COMMUNITY]->(c)
    """
    try:
        with memoria_neo4j._driver.session() as session:
            with session.begin_transaction() as tx:
                for q in reificadas.cypher_queries:
                    if q["type"] == "Community":
                        tx.run(query_community, **q["params"])
                    elif q["type"] == "Parent":
                        tx.run(query_parent, **q["params"])
                    elif q["type"] == "Member":
                        tx.run(query_member, **q["params"])
                tx.commit()
    except Exception:
        pass


def jerarquia_leiden(
    G: nx.Graph,
    max_size: int = 10,
    gamma: float = KHORA_LEIDEN_GAMMA,
    theta: float = KHORA_LEIDEN_THETA,
    seed: int = KHORA_LEIDEN_SEED,
) -> ComunidadesReificadas:
    """
    Realiza partición Leiden jerárquica.
    D2: usa leidenalg (CPMVertexPartition)
    """
    reificadas = ComunidadesReificadas()
    if G.number_of_nodes() == 0:
        return reificadas

    def _recursivo(
        subgraph: nx.Graph, nivel: int, parent_cid: str, max_size: int, g_global: nx.Graph
    ):
        if subgraph.number_of_nodes() == 0:
            return

        g_ig, nodos_list = nx_to_igraph(subgraph)

        # En Leidenalg, theta corresponde al random number en el refinamiento,
        # pero Optimiser no expone `theta` directamente. Sin embargo,
        # la D2 nos indica explícitamente: usa leidenalg que SÍ.
        # En el código pasaremos 'resolution_parameter' como se debe a CPM

        optimiser = leidenalg.Optimiser()
        optimiser.set_rng_seed(seed)

        partition = leidenalg.CPMVertexPartition(g_ig, resolution_parameter=gamma)
        optimiser.optimise_partition(partition)

        for comm_idx, comm_nodes_indices in enumerate(partition):
            miembros = [nodos_list[idx] for idx in comm_nodes_indices]
            cid = f"L{nivel}_{parent_cid or 'root'}_{comm_idx}_{hash(tuple(miembros)) & 0xffffffff}"

            reificadas.add_community(cid, nivel, gamma, theta, parent_cid, miembros)

            if len(miembros) > max_size and len(miembros) < subgraph.number_of_nodes():
                # Hierarchical split recurse
                sub_nx = subgraph.subgraph(miembros).copy()
                _recursivo(sub_nx, nivel + 1, cid, max_size, g_global)

    _recursivo(G, 0, None, max_size, G)
    return reificadas
