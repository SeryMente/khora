import os

import networkx as nx

from khora_kernel.communities import jerarquia_leiden


def test_conexidad():
    """TODA comunidad induce un subgrafo internamente conexo."""
    G = nx.erdos_renyi_graph(20, 0.2, seed=42)
    res = jerarquia_leiden(G)

    for cid, info in res.estructura.items():
        miembros = info["miembros"]
        subg = G.subgraph(miembros)
        assert nx.is_connected(subg), f"Comunidad {cid} no es conexa"

def test_estabilidad():
    """Dos corridas con la misma seed -> partición idéntica."""
    G = nx.erdos_renyi_graph(15, 0.3, seed=123)
    res1 = jerarquia_leiden(G, seed=42)
    res2 = jerarquia_leiden(G, seed=42)

    c1 = {k: set(v["miembros"]) for k, v in res1.estructura.items()}
    c2 = {k: set(v["miembros"]) for k, v in res2.estructura.items()}
    assert c1 == c2

def test_densidad():
    """Densidad interna de cada comunidad >= gamma."""
    G = nx.erdos_renyi_graph(15, 0.4, seed=42)
    gamma = 0.05
    res = jerarquia_leiden(G, gamma=gamma)

    for cid, info in res.estructura.items():
        miembros = info["miembros"]
        if len(miembros) > 1:
            subg = G.subgraph(miembros)
            densidad = nx.density(subg)
            assert densidad >= gamma, f"Densidad {densidad} < {gamma} para {cid}"

def test_jerarquia():
    """Niveles enlazados vía PARENT_COMMUNITY sin ciclos."""
    G = nx.connected_caveman_graph(3, 5)
    res = jerarquia_leiden(G, max_size=3)

    parents = {}
    for cid, info in res.estructura.items():
        if info["parent"]:
            parents[cid] = info["parent"]

    for cid in parents:
        path = set()
        curr = cid
        while curr in parents:
            assert curr not in path, "Ciclo detectado en jerarquía"
            path.add(curr)
            curr = parents[curr]

def test_reificacion():
    """Cada miembro tiene IN_COMMUNITY; propiedades gamma/theta/level presentes."""
    G = nx.path_graph(5)
    res = jerarquia_leiden(G)

    found_community = False
    found_member = False
    for q in res.cypher_queries:
        if q["type"] == "Community":
            found_community = True
            assert "gamma" in q["params"]
            assert "theta" in q["params"]
            assert "level" in q["params"]
        elif q["type"] == "Member":
            found_member = True

    assert found_community, "Debe haber consultas de reificación de comunidades"
    assert found_member, "Debe haber consultas de reificación de miembros IN_COMMUNITY"

def test_sin_llm():
    """El módulo no importa ningún cliente LLM."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = os.path.join(base_dir, "src", "khora_kernel", "communities.py")
    with open(target, "r") as f:
        content = f.read()
    assert "LLM" not in content
    assert "openai" not in content.lower()
    assert "prompts" not in content.lower()
