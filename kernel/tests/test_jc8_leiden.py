# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
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


def test_reificacion_es_staged_y_no_invalida_publicado():
    from unittest.mock import MagicMock
    from types import SimpleNamespace
    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada

    memoria = Neo4jMemoriaOrganizada.__new__(Neo4jMemoriaOrganizada)
    tx = MagicMock()
    session = MagicMock()
    driver = MagicMock()
    driver.session.return_value.__enter__.return_value = session
    session.begin_transaction.return_value.__enter__.return_value = tx
    memoria._driver = driver

    comunidades = SimpleNamespace(
        estructura={
            "c1": {
                "level": 0,
                "gamma": 1.0,
                "theta": 0.5,
                "member_fingerprint": "fp",
                "miembros": ["alice"],
                "parent": None,
            }
        }
    )

    memoria.reificar_comunidades(comunidades, "io-1", "2026-10-02T00:00:00Z", "rev-1")
    queries = [call.args[0] for call in tx.run.call_args_list]
    assert any("published = false" in q for q in queries)
    assert not any("SET c.invalid_at" in q for q in queries)
    tx.commit.assert_called_once()


def test_publicacion_comunidades_es_atomica():
    from unittest.mock import MagicMock
    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada

    memoria = Neo4jMemoriaOrganizada.__new__(Neo4jMemoriaOrganizada)
    tx = MagicMock()
    session = MagicMock()
    driver = MagicMock()
    driver.session.return_value.__enter__.return_value = session
    session.begin_transaction.return_value.__enter__.return_value = tx
    memoria._driver = driver

    memoria.publicar_comunidades("rev-2", "2026-10-02T00:00:00Z")
    queries = [call.args[0] for call in tx.run.call_args_list]
    assert len(queries) == 2
    assert any("published = true" in q for q in queries)
    assert any("SET c.invalid_at" in q for q in queries)
    tx.commit.assert_called_once()
