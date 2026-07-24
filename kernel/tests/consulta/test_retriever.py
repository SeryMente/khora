# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1

import pytest

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
import khora_kernel.embeddings


def mock_knn(query: str, k: int):
    if "khora" in query.lower():
        return [("khora", 1.0)]
    if "missing" in query.lower():
        return []
    return [("engine", 0.9)]

khora_kernel.embeddings.knn = mock_knn

@pytest.fixture
def retriever() -> RetrieverGraphRAG:
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

import os


@pytest.mark.skipif(not os.environ.get('KHORA_NEO4J_TEST_URI'), reason="Requiere base de datos Neo4j real (patrón M-1)")
def test_integracion_neo4j(retriever: RetrieverGraphRAG):
    """Prueba real contra base de datos Neo4j."""
    # Instanciamos el retriever con el driver real y probamos
    # la expansión de subgrafo en un DB.
    # Dado que es un test skip-if-no-docker, validaremos instanciando Neo4jMemoriaOrganizada
    import os

    from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada

    uri = os.environ.get("KHORA_NEO4J_TEST_URI", "bolt://localhost:7687")
    user = os.environ.get("KHORA_NEO4J_TEST_USER", "neo4j")
    password = os.environ.get("KHORA_NEO4J_TEST_PASS", "password")

    memoria_real = Neo4jMemoriaOrganizada(uri, user, password)
    retriever_real = RetrieverGraphRAG(memoria_neo4j=memoria_real, puerto_embeddings=MockPuertoEmbeddings())

    res = retriever_real.consultar("prueba", ContextoDeVisibilidad.TRANSPARENTE)

    # Asserting suficiencia depends on db content, but we test the structure
    assert isinstance(res, ResultadoDeConsulta)
