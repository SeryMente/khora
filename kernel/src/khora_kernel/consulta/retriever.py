import typing

from khora_kernel.api import (
    AristaSubgrafo,
    ContextoDeVisibilidad,
    EntidadIngresada,
    MotorDeConsulta,
    NivelSuficiencia,
    NodoSubgrafo,
    Provenance,
    PuertoEmbeddings,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)

# @req: khora.consulta.sqlite_vec
# @req: khora.consulta.embeddings

class RetrieverGraphRAG(MotorDeConsulta):
    def __init__(self, memoria_neo4j: typing.Any, puerto_embeddings: PuertoEmbeddings):
        self.memoria = memoria_neo4j
        self.puerto_embeddings = puerto_embeddings
        self.max_hops = 2

    def consultar(
        self,
        pregunta: str,
        contexto: ContextoDeVisibilidad,
    ) -> ResultadoDeConsulta:

        degradacion = []

        # 1. Obtener Semilla Semántica vía knn
        # Embeddings interface is PuertoEmbeddings
        # but to find nodes in memory we might need a semantic search
        # Since we use faiss for knn in memory mock or real embeddings
        # The prompt says: "(a) semilla semántica vía knn de embeddings (J-C7)"
        from khora_kernel.embeddings import knn

        semillas = knn(pregunta, 5)
        if not semillas:
            degradacion.append("Sin semilla knn")

        semillas_ids = [s[0] for s in semillas]

        fragmentos = []
        subgrafo_nodos = {}
        subgrafo_aristas = []
        resumenes_incluidos = False

        if not hasattr(self.memoria, "_driver") or self.memoria._driver is None:
            if hasattr(self.memoria, "mock_multi_hop"):
                res = self.memoria.mock_multi_hop(semillas_ids, contexto, self.max_hops)
                if not res:
                    return self._retornar_insuficiente(degradacion)
                fragmentos, subgrafo_nodos, subgrafo_aristas, res_incl, missing_sum = res
                resumenes_incluidos = res_incl
                if missing_sum:
                    degradacion.append("Comunidad sin resumen")
            else:
                return self._retornar_insuficiente(degradacion)
        else:
            if not semillas_ids:
                return self._retornar_insuficiente(degradacion)

            query = """
            UNWIND $semillas AS seed
            MATCH path = (e1:Entity {canonical_key: seed})-[*0..2]-(e2:Entity)
            UNWIND relationships(path) AS r
            WITH startNode(r) AS origen, endNode(r) AS destino, r
            RETURN origen.canonical_key AS origen_id, origen.provenance AS origen_prov, origen.visibilidad AS origen_vis,
                   destino.canonical_key AS destino_id, destino.provenance AS destino_prov, destino.visibilidad AS destino_vis,
                   type(r) AS relacion, r.provenance AS r_prov, r.visibilidad AS r_vis
            """

            # Additional query for communities and summaries
            query_comm = """
            UNWIND $nodos AS n_id
            MATCH (e:Entity {canonical_key: n_id})-[:IN_COMMUNITY]->(c:Community)
            RETURN e.canonical_key AS nodo_id, c.community_id AS comm_id, c.summary AS summary
            """

            try:
                with self.memoria._driver.session() as session:
                    res = session.run(query, semillas=semillas_ids)

                    nodos_visitados = set()
                    aristas_set = set()

                    for record in res:
                        o_id = record["origen_id"]
                        d_id = record["destino_id"]
                        rel = record["relacion"]

                        o_vis = ContextoDeVisibilidad(record.get("origen_vis", "privado"))
                        d_vis = ContextoDeVisibilidad(record.get("destino_vis", "privado"))
                        r_vis = ContextoDeVisibilidad(record.get("r_vis", "privado"))

                        if contexto == ContextoDeVisibilidad.TRANSPARENTE:
                            if o_vis == ContextoDeVisibilidad.PRIVADO or d_vis == ContextoDeVisibilidad.PRIVADO or r_vis == ContextoDeVisibilidad.PRIVADO:
                                continue

                        if o_id not in nodos_visitados:
                            nodos_visitados.add(o_id)
                            prov_raw = record["origen_prov"][0] if record["origen_prov"] else ""
                            subgrafo_nodos[o_id] = NodoSubgrafo(id=o_id, etiqueta="Entity")
                            fragmentos.append(
                                EntidadIngresada(
                                    id=o_id,
                                    texto=o_id + ": " + prov_raw,
                                    provenance=self._parse_prov(prov_raw),
                                    visibilidad=o_vis
                                )
                            )

                        if d_id not in nodos_visitados:
                            nodos_visitados.add(d_id)
                            prov_raw = record["destino_prov"][0] if record["destino_prov"] else ""
                            subgrafo_nodos[d_id] = NodoSubgrafo(id=d_id, etiqueta="Entity")
                            fragmentos.append(
                                EntidadIngresada(
                                    id=d_id,
                                    texto=d_id + ": " + prov_raw,
                                    provenance=self._parse_prov(prov_raw),
                                    visibilidad=d_vis
                                )
                            )

                        edge_key = (o_id, d_id, rel)
                        if edge_key not in aristas_set:
                            aristas_set.add(edge_key)
                            subgrafo_aristas.append(AristaSubgrafo(origen=o_id, destino=d_id, relacion=rel))

                    if nodos_visitados:
                        res_comm = session.run(query_comm, nodos=list(nodos_visitados))
                        for record in res_comm:
                            if record["summary"]:
                                resumenes_incluidos = True
                                fragmentos.append(
                                    EntidadIngresada(
                                        id=record["comm_id"],
                                        texto="Resumen de comunidad: " + record["summary"],
                                        provenance=Provenance(origen="comunidad", driver=None, timestamp=""),
                                        visibilidad=contexto # inherit context for now
                                    )
                                )
                            else:
                                if "Comunidad sin resumen" not in degradacion:
                                    degradacion.append("Comunidad sin resumen")

            except Exception as e:
                import logging
                logging.error(f"Error querying Neo4j: {e}")
                return self._retornar_insuficiente(degradacion)

        if not fragmentos:
            return self._retornar_insuficiente(degradacion)

        # Convert subgrafo_nodos from dict to list if it's a dict, otherwise it's already a list from mock
        if isinstance(subgrafo_nodos, dict):
            nodos_lista = list(subgrafo_nodos.values())
        else:
            nodos_lista = subgrafo_nodos

        return ResultadoDeConsulta(
            fragmentos=fragmentos,
            subgrafo=SubgrafoRelevante(nodos=nodos_lista, aristas=subgrafo_aristas),
            suficiencia=NivelSuficiencia.SUFICIENTE,
            resumenes_incluidos=resumenes_incluidos,
            degradacion_declarada=" | ".join(degradacion) if degradacion else None
        )

    def _parse_prov(self, prov_str: str) -> Provenance:
        # Helper to parse "origen=X, driver=Y, timestamp=Z" or fallback
        if "origen=" in prov_str:
            import re
            m_orig = re.search(r"origen=([^,]+)", prov_str)
            m_driv = re.search(r"driver=([^,]+)", prov_str)
            m_time = re.search(r"timestamp=([^,]+)", prov_str)
            return Provenance(
                origen=m_orig.group(1).strip() if m_orig else "neo4j",
                driver=m_driv.group(1).strip() if m_driv and m_driv.group(1).strip() != "None" else None,
                timestamp=m_time.group(1).strip() if m_time else ""
            )
        return Provenance(origen="neo4j", driver=None, timestamp="")

    def _retornar_insuficiente(self, degradacion: list[str]) -> ResultadoDeConsulta:
        return ResultadoDeConsulta(
            fragmentos=[],
            subgrafo=SubgrafoRelevante(),
            suficiencia=NivelSuficiencia.INSUFICIENTE,
            resumenes_incluidos=False,
            degradacion_declarada=" | ".join(degradacion) if degradacion else None
        )
