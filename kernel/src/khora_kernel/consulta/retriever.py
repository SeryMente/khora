# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1 · @ua UA-15,UA-16,UA-43
# @req: khora.consulta.sqlite_vec
# @req: khora.consulta.embeddings
import logging
import typing

from khora_kernel.api import (
    AristaSubgrafo,
    ContextoDeVisibilidad,
    EntidadIngresada,
    MotorDeConsulta,
    NodoSubgrafo,
    Provenance,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)


class RetrieverGraphRAG(MotorDeConsulta):
    """Retriever estructural: P_theta(G*|q,G).

    La consulta semántica solo propone semillas; la comunidad y la expansión
    topológica determinan el subgrafo efectivo.
    """

    def __init__(
        self,
        memoria_grafo: typing.Any = None,
        puerto_embeddings: typing.Any = None,
        memoria_neo4j: typing.Any = None,
    ):
        self.memoria = memoria_grafo if memoria_grafo is not None else memoria_neo4j
        self.puerto_embeddings = puerto_embeddings
        self.max_hops = 2
        self.max_community_nodes = 200

    def consultar(self, pregunta: str, contexto: ContextoDeVisibilidad) -> ResultadoDeConsulta:
        from khora_kernel.embeddings import knn

        degradacion: list[str] = []

        # Fixture/adapter path: only when there is no real graph driver.
        # Production Neo4j always follows the semantic-seed + topological path below.
        if not getattr(self.memoria, "_driver", None) and hasattr(self.memoria, "mock_multi_hop") and self.puerto_embeddings is None:
            return self._consultar_mock([], contexto, degradacion)

        semillas = knn(pregunta, 8)
        semillas_ids = [sid for sid, _ in semillas]
        if not semillas_ids:
            return self._retornar_insuficiente(["Sin semilla knn"])

        if not getattr(self.memoria, "_driver", None):
            return self._consultar_mock(semillas_ids, contexto, degradacion)

        try:
            graph_revision = (
                self.memoria.get_graph_revision()
                if hasattr(self.memoria, "get_graph_revision")
                else "unknown"
            )
            with self.memoria._driver.session() as session:
                community_rows = list(session.run(
                    """
                    UNWIND $seeds AS sid
                    MATCH (e:Entity {canonical_key:sid})-[:IN_COMMUNITY]->(
                        c:Community {graph_revision:$revision}
                    )
                    WHERE e.invalid_at IS NULL
                      AND c.invalid_at IS NULL
                      AND c.published = true
                    RETURN DISTINCT sid, c.community_id AS community_id
                    ORDER BY community_id
                    """,
                    seeds=semillas_ids,
                    revision=graph_revision,
                ))
                community_ids = sorted({r["community_id"] for r in community_rows if r["community_id"]})

                member_ids: set[str] = set()
                if community_ids:
                    member_rows = session.run(
                        """
                        UNWIND $cids AS cid
                        MATCH (e:Entity)-[:IN_COMMUNITY]->(
                            c:Community {
                                community_id:cid,
                                graph_revision:$revision
                            }
                        )
                        WHERE e.invalid_at IS NULL
                          AND c.invalid_at IS NULL
                          AND c.published = true
                        RETURN DISTINCT e.canonical_key AS id
                        LIMIT $lim
                        """,
                        cids=community_ids,
                        revision=graph_revision,
                        lim=self.max_community_nodes,
                    )
                    member_ids = {r["id"] for r in member_rows if r["id"]}

                expansion_rows = session.run(
                    """
                    UNWIND $seeds AS sid
                    MATCH p=(s:Entity {canonical_key:sid})-[:RELATION*0..2]->(e)
                    WHERE all(x IN nodes(p) WHERE x.invalid_at IS NULL
                      AND any(label IN labels(x) WHERE label IN ['Entity','Literal','Blank']))
                      AND any(label IN labels(e) WHERE label IN ['Entity','Literal','Blank'])
                    RETURN DISTINCT
                      [x IN nodes(p) | coalesce(x.id,x.canonical_key)] AS path_nodes,
                      [x IN relationships(p) | {
                        source: coalesce(startNode(x).id,startNode(x).canonical_key),
                        target: coalesce(endNode(x).id,endNode(x).canonical_key),
                        relation: type(x)
                      }] AS path_edges
                    """,
                    seeds=semillas_ids,
                )
                expanded_ids: set[str] = set(semillas_ids) | member_ids
                for row in expansion_rows:
                    expanded_ids.update(x for x in row["path_nodes"] if x)
                if not expanded_ids:
                    return self._retornar_insuficiente(["Expansión topológica vacía"])

                visible_ids = self._filter_visibility(session, expanded_ids, contexto)
                if not visible_ids:
                    return self._retornar_insuficiente(["Subgrafo eliminado por visibilidad"])

                edge_rows = session.run(
                    """
                    MATCH (a)-[r:RELATION]->(b)
                    WHERE a.invalid_at IS NULL AND b.invalid_at IS NULL
                      AND r.invalid_at IS NULL
                      AND any(label IN labels(a) WHERE label IN ['Entity','Literal','Blank'])
                      AND any(label IN labels(b) WHERE label IN ['Entity','Literal','Blank'])
                      AND a.canonical_key IN $ids AND b.canonical_key IN $ids
                    RETURN coalesce(a.id,a.canonical_key) AS source,
                           coalesce(b.id,b.canonical_key) AS target,
                           type(r) AS relation,
                           CASE WHEN a:Literal THEN toString(a.value)
                                ELSE coalesce(a.label_original,a.canonical_key) END AS source_text,
                           CASE WHEN b:Literal THEN toString(b.value)
                                ELSE coalesce(b.label_original,b.canonical_key) END AS target_text,
                           properties(a)['provenance'] AS source_prov,
                           properties(b)['provenance'] AS target_prov,
                           properties(a)['visibilidad'] AS source_vis,
                           properties(b)['visibilidad'] AS target_vis
                    ORDER BY source, target, relation
                    """,
                    ids=list(visible_ids),
                )

                node_rows = session.run(
                    """
                    MATCH (e)
                    WHERE e.canonical_key IN $ids AND e.invalid_at IS NULL
                      AND any(label IN labels(e) WHERE label IN ['Entity','Literal','Blank'])
                    RETURN coalesce(e.id,e.canonical_key) AS id,
                           labels(e) AS node_labels,
                           CASE WHEN e:Literal THEN toString(e.value)
                                ELSE coalesce(e.label_original,e.canonical_key) END AS text,
                           properties(e)['provenance'] AS provenance,
                           coalesce(properties(e)['visibilidad'],'privado') AS visibilidad
                    ORDER BY id
                    """,
                    ids=list(visible_ids),
                )
                node_map = {}
                fragmentos = []
                for row in node_rows:
                    node_labels = row.get("node_labels") or ["Entity"]
                    etiqueta = next(
                        (label for label in ("Entity", "Literal", "Blank") if label in node_labels),
                        "Entity",
                    )
                    node_map[row["id"]] = NodoSubgrafo(id=row["id"], etiqueta=etiqueta)
                    fragmentos.append(
                        EntidadIngresada(
                            id=row["id"],
                            texto=row["text"],
                            provenance=self._parse_prov(
                                (row["provenance"] or [""])[0]
                            ),
                            visibilidad=self._visibility(row["visibilidad"]),
                        )
                    )

                edges = []
                seen = set()
                for row in edge_rows:
                    source, target, relation = row["source"], row["target"], row["relation"]
                    if source not in node_map or target not in node_map:
                        continue
                    key = (source, target, relation)
                    if key not in seen:
                        seen.add(key)
                        edges.append(
                            AristaSubgrafo(origen=source, destino=target, relacion=relation)
                        )

                summaries = []
                if community_ids:
                    for row in session.run(
                        """
                        UNWIND $cids AS cid
                        MATCH (c:Community {
                            community_id:cid,
                            graph_revision:$revision
                        })
                        WHERE c.invalid_at IS NULL AND c.published = true
                        RETURN c.community_id AS id, c.summary AS summary,
                               c.graph_revision AS graph_revision
                        ORDER BY id
                        """,
                        cids=community_ids,
                        revision=graph_revision,
                    ):
                        if row["summary"]:
                            summaries.append(row["id"])
                            fragmentos.append(
                                EntidadIngresada(
                                    id=row["id"],
                                    texto="Resumen de comunidad: " + row["summary"],
                                    provenance=Provenance(
                                        origen="comunidad", driver=None, timestamp=""
                                    ),
                                    visibilidad=contexto,
                                )
                            )

                if not summaries:
                    degradacion.append("Sin resumen de comunidad")
                revision = graph_revision
                degradacion.append(
                    f"GraphRAG revision={revision} seeds={len(semillas_ids)} "
                    f"communities={len(community_ids)} nodes={len(node_map)}"
                )
                if not edges:
                    degradacion.append("G* sin aristas semánticas")

                return ResultadoDeConsulta(
                    fragmentos=fragmentos,
                    subgrafo=SubgrafoRelevante(
                        nodos=list(node_map.values()), aristas=edges
                    ),
                    suficiencia=(
                        __import__("khora_kernel.api", fromlist=["NivelSuficiencia"])
                        .NivelSuficiencia.SUFICIENTE
                    ),
                    resumenes_incluidos=bool(summaries),
                    degradacion_declarada=" | ".join(degradacion),
                )
        except Exception as exc:
            logging.error("[GraphRAG] error: %s", exc)
            return self._retornar_insuficiente([f"Error GraphRAG: {exc}"])

    @staticmethod
    def _visibility(value: str | None) -> ContextoDeVisibilidad:
        try:
            return ContextoDeVisibilidad(value or "privado")
        except ValueError:
            return ContextoDeVisibilidad.PRIVADO

    def _filter_visibility(self, session, ids: set[str], contexto) -> set[str]:
        rows = session.run(
            """
            UNWIND $ids AS id
            MATCH (e:Entity {canonical_key:id})
            WHERE e.invalid_at IS NULL
            RETURN e.canonical_key AS id, coalesce(e.visibilidad,'privado') AS vis
            """,
            ids=list(ids),
        )
        if contexto == ContextoDeVisibilidad.PRIVADO:
            return {r["id"] for r in rows}
        return {
            r["id"] for r in rows
            if self._visibility(r["vis"]) == ContextoDeVisibilidad.TRANSPARENTE
        }

    def _consultar_mock(self, semillas_ids, contexto, degradacion):
        if hasattr(self.memoria, "mock_multi_hop"):
            res = self.memoria.mock_multi_hop(semillas_ids, contexto, self.max_hops)
            if res:
                fragmentos, nodos, aristas, incluidos, faltan = res
                if faltan:
                    degradacion.append("Comunidad sin resumen")
                return ResultadoDeConsulta(
                    fragmentos=fragmentos,
                    subgrafo=SubgrafoRelevante(nodos=nodos, aristas=aristas),
                    suficiencia=__import__("khora_kernel.api", fromlist=["NivelSuficiencia"]).NivelSuficiencia.SUFICIENTE,
                    resumenes_incluidos=incluidos,
                    degradacion_declarada=" | ".join(degradacion) or None,
                )
        return self._retornar_insuficiente(degradacion + ["Memoria sin driver"])

    def _parse_prov(self, prov_str: str) -> Provenance:
        if not prov_str or "origen=" not in prov_str:
            return Provenance(origen="grafo", driver=None, timestamp="")
        import re
        m_orig = re.search(r"origen=([^,]+)", prov_str)
        m_driv = re.search(r"driver=([^,]+)", prov_str)
        m_time = re.search(r"timestamp=([^,]+)", prov_str)
        return Provenance(
            origen=m_orig.group(1).strip() if m_orig else "grafo",
            driver=(m_driv.group(1).strip() if m_driv else None),
            timestamp=(m_time.group(1).strip() if m_time else ""),
        )

    @staticmethod
    def _retornar_insuficiente(degradacion):
        return ResultadoDeConsulta(
            fragmentos=[],
            subgrafo=SubgrafoRelevante(),
            suficiencia=__import__("khora_kernel.api", fromlist=["NivelSuficiencia"]).NivelSuficiencia.INSUFICIENTE,
            resumenes_incluidos=False,
            degradacion_declarada=" | ".join(degradacion) if degradacion else None,
        )
