# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1

import pytest

import khora_kernel.embeddings
from khora_kernel.api import ContextoDeVisibilidad, NivelSuficiencia, PuertoEmbeddings
from khora_kernel.consulta.retriever import RetrieverGraphRAG


class MockPuertoEmbeddings(PuertoEmbeddings):
    def incrustar(self, textos: list[str]) -> list[list[float]]:
        return [[0.1, 0.2, 0.3]] * len(textos)

class MockMemoriaMultiHop:
    def __init__(self):
        self._driver = None # Simulate mock
        # Subgraph structure:
        # 1. Khora (seed) -[related_to]-> Engine
        # 2. Engine -[handles]-> Gravedad
        # 3. Khora -[has_password]-> Secreto (private)

        self.nodes = {
            "khora": {"prov": "origen=archivo, driver=None, timestamp=2026-07-18T00:00:00Z", "vis": "transparente", "comm": "c1"},
            "engine": {"prov": "origen=archivo, driver=None, timestamp=2026-07-18T00:01:00Z", "vis": "transparente", "comm": "c1"},
            "gravedad": {"prov": "origen=archivo, driver=None, timestamp=2026-07-18T00:02:00Z", "vis": "transparente", "comm": "c2"},
            "secreto": {"prov": "origen=chat, driver=None, timestamp=2026-07-18T00:03:00Z", "vis": "privado", "comm": "c1"},
        }

        self.edges = [
            ("khora", "engine", "related_to", "transparente"),
            ("engine", "gravedad", "handles", "transparente"),
            ("khora", "secreto", "has_password", "privado"),
        ]

        self.comms = {
            "c1": "Khora and its internal structures",
            "c2": None # missing summary
        }

    def mock_multi_hop(self, semillas_ids, contexto, max_hops):
        from khora_kernel.api import (
            AristaSubgrafo,
            EntidadIngresada,
            NodoSubgrafo,
            Provenance,
        )

        if not semillas_ids:
            return None

        fragmentos = []
        subgrafo_nodos = {}
        subgrafo_aristas = []
        resumenes_incluidos = False
        missing_sum = False

        # Simple BFS simulation for 2 hops
        visited_nodes = set()
        queue = [(seed, 0) for seed in semillas_ids if seed in self.nodes]

        if not queue:
            return None

        while queue:
            curr_id, hop = queue.pop(0)
            if curr_id not in visited_nodes:
                visited_nodes.add(curr_id)
                n_info = self.nodes[curr_id]

                if contexto == ContextoDeVisibilidad.TRANSPARENTE and n_info["vis"] == "privado":
                    continue

                # add to fragments
                subgrafo_nodos[curr_id] = NodoSubgrafo(id=curr_id, etiqueta="Entity")
                prov = Provenance(origen="mock", driver=None, timestamp="")

                fragmentos.append(
                    EntidadIngresada(
                        id=curr_id,
                        texto=curr_id + " info",
                        provenance=prov,
                        visibilidad=ContextoDeVisibilidad(n_info["vis"])
                    )
                )

                # Check comms
                c_id = n_info["comm"]
                c_sum = self.comms.get(c_id)
                if c_sum:
                    resumenes_incluidos = True
                    # avoid adding comm multiple times conceptually, but simple for mock
                else:
                    missing_sum = True

                if hop < max_hops:
                    for o, d, rel, r_vis in self.edges:
                        if contexto == ContextoDeVisibilidad.TRANSPARENTE and r_vis == "privado":
                            continue

                        if o == curr_id:
                            queue.append((d, hop + 1))
                            subgrafo_aristas.append(AristaSubgrafo(origen=o, destino=d, relacion=rel))
                        elif d == curr_id:
                            queue.append((o, hop + 1))
                            subgrafo_aristas.append(AristaSubgrafo(origen=o, destino=d, relacion=rel))

        return fragmentos, list(subgrafo_nodos.values()), subgrafo_aristas, resumenes_incluidos, missing_sum


# Monkeypatch knn for testing


def mock_knn(query: str, k: int):
    if "khora" in query.lower():
        return [("khora", 1.0)]
    if "missing" in query.lower():
        return []
    return [("engine", 0.9)]

@pytest.fixture
def retriever(monkeypatch) -> RetrieverGraphRAG:
    monkeypatch.setattr(khora_kernel.embeddings, "knn", mock_knn)
    mem = MockMemoriaMultiHop()
    emb = MockPuertoEmbeddings()
    ret = RetrieverGraphRAG(memoria_neo4j=mem, puerto_embeddings=emb)
    return ret

def test_provenance(retriever: RetrieverGraphRAG):
    """test_provenance: verifica que subgrafo multihop devuelto por el mock tenga provenance y devuelva fragmentos."""
    resultado = retriever.consultar("khora", ContextoDeVisibilidad.TRANSPARENTE)

    assert resultado.suficiencia == NivelSuficiencia.SUFICIENTE
    assert len(resultado.fragmentos) > 0

    ids = [f.id for f in resultado.fragmentos]
    assert "khora" in ids
    assert "engine" in ids
    assert "gravedad" in ids # 2 hops away! khora -> engine -> gravedad
    assert "secreto" not in ids # private

    assert resultado.resumenes_incluidos is True
    assert "Comunidad sin resumen" in resultado.degradacion_declarada # c2 missing summary


def test_particion_visibilidad(retriever: RetrieverGraphRAG):
    """test_particion_visibilidad: contexto transparente -> cero fragmentos privados."""
    res_transparente = retriever.consultar("khora", ContextoDeVisibilidad.TRANSPARENTE)
    ids_t = [f.id for f in res_transparente.fragmentos]
    assert "secreto" not in ids_t

    res_privado = retriever.consultar("khora", ContextoDeVisibilidad.PRIVADO)
    ids_p = [f.id for f in res_privado.fragmentos]
    assert "secreto" in ids_p


def test_subgrafo(retriever: RetrieverGraphRAG):
    """test_subgrafo: fragmentos/subgrafo correctos de forma determinista y expansiones >= 2."""
    res = retriever.consultar("khora", ContextoDeVisibilidad.TRANSPARENTE)
    assert res.suficiencia == NivelSuficiencia.SUFICIENTE

    # khora, engine, gravedad
    assert len(res.subgrafo.nodos) == 3
    # khora->engine, engine->gravedad
    assert len(res.subgrafo.aristas) >= 2


def test_insuficiente(retriever: RetrieverGraphRAG):
    """test_insuficiente: pregunta sin semilla knn o sin resolver."""
    res = retriever.consultar("missing_query", ContextoDeVisibilidad.TRANSPARENTE)

    assert res.suficiencia == NivelSuficiencia.INSUFICIENTE
    assert len(res.fragmentos) == 0
    assert len(res.subgrafo.nodos) == 0
    assert len(res.subgrafo.aristas) == 0
    assert res.resumenes_incluidos is False
    assert "Sin semilla knn" in res.degradacion_declarada



def test_integracion_neo4j(neo4j_config, monkeypatch):
    """Valida GraphRAG contra Neo4j real y la influencia causal de comunidades.

    La semilla KNN se fija sólo para aislar el retriever; la selección
    topológica, las comunidades y la construcción de G* se ejecutan sobre
    la instancia Neo4j real proporcionada por el fixture.
    """
    from neo4j import GraphDatabase

    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada

    memoria_real = Neo4jMemoriaOrganizada(
        neo4j_config["uri"],
        neo4j_config["user"],
        neo4j_config["password"],
    )
    driver = GraphDatabase.driver(
        neo4j_config["uri"],
        auth=(neo4j_config["user"], neo4j_config["password"]),
    )
    seed_id = "e2e_seed"
    member_id = "e2e_community_member"
    community_id = "e2e-community"

    try:
        with driver.session() as session:
            session.run(
                """
                MATCH (n)
                WHERE n.canonical_key IN $ids OR n.community_id = $cid
                DETACH DELETE n
                """,
                ids=[seed_id, member_id],
                cid=community_id,
            )
            session.run(
                """
                CREATE (a:Entity {
                    id:$seed, canonical_key:$seed, label_original:'Semilla E2E',
                    provenance:['origen=e2e, driver=ci, timestamp=2026-10-02T18:00:00Z'],
                    visibilidad:'transparente', invalid_at:null
                })
                CREATE (b:Entity {
                    id:$member, canonical_key:$member, label_original:'Miembro comunitario E2E',
                    provenance:['origen=e2e, driver=ci, timestamp=2026-10-02T18:00:00Z'],
                    visibilidad:'transparente', invalid_at:null
                })
                """,
                seed=seed_id,
                member=member_id,
            )
            graph_revision = memoria_real.get_graph_revision()
            with driver.session() as session:
                session.run(
                    """
                    MATCH (a:Entity {canonical_key:$seed})
                    MATCH (b:Entity {canonical_key:$member})
                    CREATE (c:Community {
                        community_id:$cid, graph_revision:$revision,
                        published:true, published_at:datetime(),
                        invalid_at:null, summary:'Resumen E2E'
                    })
                    CREATE (a)-[:IN_COMMUNITY {
                        published:true, invalid_at:null,
                        created_at:datetime(), valid_at:datetime()
                    }]->(c)
                    CREATE (b)-[:IN_COMMUNITY {
                        published:true, invalid_at:null,
                        created_at:datetime(), valid_at:datetime()
                    }]->(c)
                    """,
                    seed=seed_id,
                    member=member_id,
                    cid=community_id,
                    revision=graph_revision,
                )

        monkeypatch.setattr(
            khora_kernel.embeddings,
            "knn",
            lambda query, k: [(seed_id, 1.0)],
        )
        retriever_real = RetrieverGraphRAG(memoria_neo4j=memoria_real)

        active = retriever_real.consultar(
            "Semilla E2E",
            ContextoDeVisibilidad.TRANSPARENTE,
        )
        active_ids = {node.id for node in active.subgrafo.nodos}

        assert active.suficiencia == NivelSuficiencia.SUFICIENTE
        assert seed_id in active_ids
        assert member_id in active_ids
        assert "communities=1" in active.degradacion_declarada

        with driver.session() as session:
            session.run(
                """
                MATCH (c:Community {community_id:$cid})
                SET c.invalid_at = datetime()
                WITH c
                MATCH (e:Entity)-[r:IN_COMMUNITY]->(c)
                SET r.invalid_at = datetime(), r.published = false
                """,
                cid=community_id,
            )

        disabled = retriever_real.consultar(
            "Semilla E2E",
            ContextoDeVisibilidad.TRANSPARENTE,
        )
        disabled_ids = {node.id for node in disabled.subgrafo.nodos}

        assert seed_id in disabled_ids
        assert member_id not in disabled_ids
        assert active_ids != disabled_ids
    finally:
        with driver.session() as session:
            session.run(
                "MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n",
                ids=[seed_id, member_id],
            )
            session.run(
                "MATCH (c:Community {community_id:$cid}) DETACH DELETE c",
                cid=community_id,
            )
        driver.close()
        memoria_real.cerrar()


def test_integracion_neo4j_con_literal_en_gstar(neo4j_config, monkeypatch):
    """Un hecho Entity->Literal debe sobrevivir la construcci�n de G* real."""
    from neo4j import GraphDatabase

    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada

    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"]
    )
    driver = GraphDatabase.driver(
        neo4j_config["uri"], auth=(neo4j_config["user"], neo4j_config["password"])
    )
    entity_id = "e2e_literal_entity"
    literal_id = "literal:42"

    try:
        with driver.session() as session:
            session.run(
                "MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n",
                ids=[entity_id, literal_id],
            )
            session.run(
                """
                CREATE (e:Entity {
                    id:$entity, canonical_key:$entity,
                    label_original:'Alice',
                    provenance:['origen=e2e, driver=ci, timestamp=2026-10-02T19:00:00Z'],
                    visibilidad:'privado', invalid_at:null,
                    created_at:datetime(), valid_at:datetime()
                })
                CREATE (l:Literal {
                    id:$literal, canonical_key:$literal,
                    value:'42', datatype:'integer',
                    invalid_at:null, created_at:datetime(), valid_at:datetime()
                })
                CREATE (e)-[:RELATION {
                    type:'HAS_AGE', io_id:'io-literal-e2e',
                    provenance:['origen=e2e, driver=ci, timestamp=2026-10-02T19:00:00Z'],
                    invalid_at:null, created_at:datetime(), valid_at:datetime()
                }]->(l)
                """,
                entity=entity_id,
                literal=literal_id,
            )

        monkeypatch.setattr(
            khora_kernel.embeddings,
            "knn",
            lambda query, k: [(entity_id, 1.0)],
        )
        retriever = RetrieverGraphRAG(memoria_neo4j=memoria)
        result = retriever.consultar("edad de Alice", ContextoDeVisibilidad.PRIVADO)

        node_map = {node.id: node.etiqueta for node in result.subgrafo.nodos}
        edge_tuples = {
            (edge.origen, edge.destino, edge.relacion)
            for edge in result.subgrafo.aristas
        }
        fragment_map = {fragment.id: fragment.texto for fragment in result.fragmentos}

        assert literal_id in node_map
        assert node_map[literal_id] == "Literal"
        assert (entity_id, literal_id, "HAS_AGE") in edge_tuples
        assert fragment_map[literal_id] == "42"
    finally:
        with driver.session() as session:
            session.run(
                "MATCH (n) WHERE n.canonical_key IN $ids DETACH DELETE n",
                ids=[entity_id, literal_id],
            )
        driver.close()
        memoria.cerrar()
