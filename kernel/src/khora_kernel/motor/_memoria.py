# @l0 L0-002-R · @req ING-03/REQ-1,GRAFO-01/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-03,UA-04,UA-05,UA-06
import json
import logging
from typing import Any, Dict, List, Optional

from neo4j import GraphDatabase

from khora_kernel.api import Provenance, Triple


class IngestaFallidaError(Exception):
    pass

class HuerfanosDetectadosError(IngestaFallidaError):
    def __init__(self, io_id: str, huerfanos: List[str]):
        super().__init__(f"Ingesta genera {len(huerfanos)} nodos huérfanos. IO_ID: {io_id}")
        self.io_id = io_id
        self.huerfanos = huerfanos

class ConsultaFallidaError(Exception):
    pass

class Neo4jMemoriaOrganizada:
    """Sustrato PKG bi-temporal G=(N,R,T)"""

    def __init__(self, uri: str, user: str, password: str):
        self._uri = uri
        self._user = user
        self._password = password
        self._driver = None
        self._conectar()

    def _conectar(self):
        try:
            self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password))
        except Exception as e:
            raise Exception(f"No se pudo conectar a Neo4j: {str(e)}")

    def cerrar(self) -> None:
        if self._driver is not None:
            self._driver.close()
            self._driver = None

    def _asegurar_conexion(self):
        if self._driver is None:
            self._conectar()

    def buscar_entidades_candidatas(self, label_norm: str) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        import os
        limit = int(os.environ.get("KHORA_ER_CAND_LIMIT", "500"))
        # As per Schema N_e, L, B. Canditados solo deberian ser Entity
        query = """
        MATCH (e:Entity)
        WITH e
        ORDER BY CASE WHEN e.canonical_key = $label_norm THEN 0 ELSE 1 END
        RETURN e.canonical_key AS canonical_key, e.embedding AS embedding, e.provenance AS provenance
        LIMIT $lim
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, label_norm=label_norm, lim=limit)
                candidatos = []
                for record in result:
                    candidatos.append({
                        "canonical_key": record["canonical_key"],
                        "embedding": record["embedding"],
                        "descripcion": record["provenance"][0] if record["provenance"] else ""
                    })
                return candidatos
        except Exception as e:
            raise Exception(f"Error buscando entidades: {str(e)}")

    def asentar_transaccional(
        self,
        entidades: List[Dict[str, Any]],
        relaciones: List[Dict[str, Any]],
        source_triplet: Dict[str, Any],
        io_id: str,
        timestamp: str,
    ) -> int:
        self._asegurar_conexion()
        if not io_id:
            raise ValueError("io_id ausente: el asentamiento exige el identificador del Objeto de Información (ACR-1.2).")

        query_entidades = """
        UNWIND $entidades AS e
        MERGE (n:Entity {canonical_key: e.canonical_key})
        ON CREATE SET
            n.id = e.canonical_key,
            n.label_original = e.label_original,
            n.embedding = e.embedding,
            n.provenance = [e.provenance_raw],
            n.event_time = e.event_time,
            n.capture_time = e.capture_time,
            n.custody = e.custody,
            n.needs_review = e.needs_review,
            n.created_at = datetime($ts),
            n.valid_at = datetime($ts),
            n.invalid_at = null
        ON MATCH SET
            n.provenance = n.provenance + [e.provenance_raw]
        """

        query_relaciones_entity = """
        UNWIND $relaciones AS r
        MATCH (origen:Entity {canonical_key: r.origen_id})
        MATCH (destino:Entity {canonical_key: r.destino_id})
        MERGE (origen)-[rel:RELATION {type: r.relacion, io_id: $io_id}]->(destino)
        ON CREATE SET
            rel.provenance = [r.provenance],
            rel.event_time = r.event_time,
            rel.capture_time = r.capture_time,
            rel.custody = r.custody,
            rel.created_at = datetime($ts),
            rel.valid_at = datetime($ts),
            rel.invalid_at = null
        ON MATCH SET
            rel.provenance = rel.provenance + [r.provenance]
        RETURN count(rel) as count
        """

        query_relaciones_literal = """
        UNWIND $relaciones AS r
        MATCH (origen:Entity {canonical_key: r.origen_id})
        MERGE (destino:Literal {canonical_key: r.destino_id})
        ON CREATE SET
            destino.id = r.destino_id,
            destino.value = r.literal_value,
            destino.datatype = r.literal_datatype,
            destino.created_at = datetime($ts),
            destino.valid_at = datetime($ts),
            destino.invalid_at = null
        MERGE (origen)-[rel:RELATION {type: r.relacion, io_id: $io_id}]->(destino)
        ON CREATE SET
            rel.provenance = [r.provenance],
            rel.event_time = r.event_time,
            rel.capture_time = r.capture_time,
            rel.custody = r.custody,
            rel.created_at = datetime($ts),
            rel.valid_at = datetime($ts),
            rel.invalid_at = null
        ON MATCH SET
            rel.provenance = rel.provenance + [r.provenance]
        RETURN count(rel) as count
        """

        anclaje_query = """
        MERGE (u:Entity:User {id:'root'})
        ON CREATE SET u.canonical_key='root', u.created_at=datetime($ts),
                      u.valid_at=datetime($ts), u.invalid_at=null
        MERGE (io:InformationObject {canonical_key:$io_key})
        ON CREATE SET io.io_id=$io_id, io.provenance=[$prov_str],
                      io.metadata_json=$metadata_json, io.source_schema=$source_schema,
                      io.event_time=$event_time, io.capture_time=$capture_time, io.custody=$custody,
                      io.created_at=datetime($ts), io.valid_at=datetime($ts), io.invalid_at=null,
                      io.volcado_id=$volcado_id, io.version=$version, io.sha256=$sha256
        ON MATCH SET io.provenance = io.provenance + [$prov_str]
        MERGE (u)-[owns:OWNS {io_id:$io_id}]->(io)
        ON CREATE SET owns.created_at=datetime($ts), owns.valid_at=datetime($ts), owns.invalid_at=null
        WITH io
        UNWIND $claves AS clave
        MERGE (e:Entity {canonical_key: clave})
        ON CREATE SET e.id=clave, e.created_at=datetime($ts), e.valid_at=datetime($ts), e.invalid_at=null
        MERGE (io)-[m:MENTIONS {io_id:$io_id}]->(e)
        ON CREATE SET m.created_at=datetime($ts), m.valid_at=datetime($ts), m.invalid_at=null
        RETURN count(m) AS anclados
        """

        restriccion_query = """
        MATCH (n)
        WHERE size([l IN labels(n) WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    ts = timestamp
                    io_key = 'io:' + io_id
                    prov_str_io = (
                        f"asentamiento=p5b, origen={source_triplet.get('origen','')}, "
                        f"driver={source_triplet.get('driver','')}, timestamp={ts}"
                    )

                    # Verificar terna existente y conflicto antes de mutar
                    volcado = source_triplet.get("volcado_id")
                    version = int(source_triplet.get("version")) if "version" in source_triplet and source_triplet["version"] is not None else None
                    sha256 = source_triplet.get("sha256")

                    if volcado:
                        existente = tx.run("MATCH (io:InformationObject {io_id:$io}) RETURN io.volcado_id AS v, io.version AS ver, io.sha256 AS s", io=io_id).single()
                        if existente:
                            if existente["v"] == volcado and existente["ver"] == version and existente["s"] == sha256:
                                return 0
                            raise Exception(f"Conflicto terna io_id={io_id}")

                    if entidades:
                        tx.run(query_entidades, entidades=entidades, ts=ts)

                    escritos = 0
                    relaciones_entity = [
                        r for r in relaciones
                        if str(r.get("object_kind", "entity")).lower() != "literal"
                    ]
                    relaciones_literal = [
                        r for r in relaciones
                        if str(r.get("object_kind", "")).lower() == "literal"
                    ]
                    if relaciones_entity:
                        res_rel = tx.run(
                            query_relaciones_entity,
                            relaciones=relaciones_entity,
                            io_id=io_id,
                            ts=ts,
                        )
                        record = res_rel.single()
                        escritos += record["count"] if record else 0
                    if relaciones_literal:
                        res_lit = tx.run(
                            query_relaciones_literal,
                            relaciones=relaciones_literal,
                            io_id=io_id,
                            ts=ts,
                        )
                        record = res_lit.single()
                        escritos += record["count"] if record else 0

                    claves_list = list(set(
                        [e["canonical_key"] for e in entidades]
                        + [r["origen_id"] for r in relaciones]
                        + [r["destino_id"] for r in relaciones_entity]
                    ))
                    if claves_list:
                        tx.run(
                            anclaje_query, ts=ts, io_id=io_id, io_key=io_key,
                            prov_str=prov_str_io, claves=claves_list, volcado_id=volcado,
                            version=version, sha256=sha256,
                            metadata_json=__import__("json").dumps(source_triplet.get("metadata") or {}, ensure_ascii=False, sort_keys=True),
                            source_schema=source_triplet.get("source_schema"),
                            event_time=source_triplet.get("event_time"),
                            capture_time=source_triplet.get("capture_time"),
                            custody=source_triplet.get("custody"),
                        )

                    # Verificar Unión Disjunta
                    res_viol = tx.run(restriccion_query)
                    viol_count = sum([r[0] for r in res_viol])
                    if viol_count > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción real: nodo con doble clase (Entity, Literal, Blank).")

                    tx.commit()
                    return escritos
        except Exception as e:
            raise Exception(f"Error en asentamiento transaccional único: {str(e)}")

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: List[float], needs_review: bool = False) -> None:
        self._asegurar_conexion()
        query = """
        MERGE (e:Entity {canonical_key: $canonical_key})
        ON CREATE SET
            e.label_original = $label_original,
            e.embedding = $embedding,
            e.provenance = [$provenance_raw],
            e.needs_review = $needs_review,
            e.created_at = datetime(),
            e.valid_at = datetime(),
            e.invalid_at = null
        ON MATCH SET
            e.provenance = e.provenance + [$provenance_raw]
        """

        restriccion_query = """
        MATCH (n {canonical_key: $canonical_key})
        WITH n, labels(n) as lbls
        WHERE size([l IN lbls WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    tx.run(query, canonical_key=canonical_key, label_original=label_original, embedding=embedding, provenance_raw=provenance_raw, needs_review=needs_review)

                    # ACR-1.1: Restricción de unión disjunta N_e, L, B
                    res = tx.run(restriccion_query, canonical_key=canonical_key)
                    violaciones = res.single()["violaciones"]
                    if violaciones > 0:
                        tx.rollback()
                        raise ValueError(f"Violación de restricción real: el nodo {canonical_key} tiene más de una clase disjunta (Entity, Literal, Blank).")

                    tx.commit()
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en MERGE de entidad: {str(e)}")

    def _preparar_triples_para_asentamiento(
        self, triples: List[Triple], provenance: Provenance
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        entidades: dict[str, dict[str, Any]] = {}
        relaciones: list[dict[str, Any]] = []
        for t in triples:
            object_kind = str((t.metadata or {}).get('node_kind', 'entity')).lower()
            if t.destino_id == 'root':
                raise ValueError('Violación UA-03: u/root no puede aparecer como cola de una relación.')
            for node_id in [t.origen_id] + ([] if object_kind == 'literal' else [t.destino_id]):
                entidades.setdefault(node_id, {
                    'canonical_key': node_id,
                    'label_original': node_id,
                    'provenance_raw': f'origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}',
                    'event_time': getattr(t.provenance, 'event_time', None),
                    'capture_time': getattr(t.provenance, 'capture_time', None),
                    'custody': getattr(t.provenance, 'custody', None),
                    'embedding': None,
                    'needs_review': False,
                })
            relaciones.append({
                'origen_id': t.origen_id,
                'destino_id': t.destino_id,
                'relacion': t.relacion,
                'provenance': f'origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}',
                'event_time': getattr(t.provenance, 'event_time', None),
                'capture_time': getattr(t.provenance, 'capture_time', None),
                'custody': getattr(t.provenance, 'custody', None),
                'object_kind': object_kind,
                'literal_value': (t.metadata or {}).get('literal_value'),
                'literal_datatype': (t.metadata or {}).get('literal_datatype'),
            })
        return list(entidades.values()), relaciones

    def escribir_ingesta(
        self, triples: List[Triple], provenance: Provenance, io_id=None,
        terna_volcado: Optional[dict] = None
    ) -> int:
        if not provenance:
            raise Exception('No se puede escribir sin provenance.')
        if not io_id:
            raise ValueError('io_id ausente: la escritura exige el identificador del Objeto de Informacion.')
        entidades, relaciones = self._preparar_triples_para_asentamiento(triples, provenance)
        source = dict(terna_volcado or {})
        source.update({
            'origen': provenance.origen,
            'driver': provenance.driver,
            'timestamp': provenance.timestamp,
            'event_time': getattr(provenance, 'event_time', None),
            'capture_time': getattr(provenance, 'capture_time', None),
            'custody': getattr(provenance, 'custody', None),
        })
        return self.asentar_transaccional(
            entidades=entidades,
            relaciones=relaciones,
            source_triplet=source,
            io_id=io_id,
            timestamp=provenance.timestamp,
        )

    def fusionar_ingesta(
        self, triples: List[Triple], provenance: Provenance, io_id=None,
        terna_volcado: Optional[dict] = None
    ) -> int:
        """Compatibilidad: usa el mismo camino tipado y atómico."""
        return self.escribir_ingesta(triples, provenance, io_id=io_id, terna_volcado=terna_volcado)
    def get_all_nodes(self) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (n)
        WHERE n.invalid_at IS NULL
          AND ((n:Entity AND NOT n:User AND NOT n:InformationObject) OR n:Community)
        RETURN coalesce(n.id, n.canonical_key, n.community_id) AS id,
               CASE WHEN n:Community THEN 'Community' ELSE 'Entity' END AS label,
               n.label_original AS text,
               n.description AS description,
               n.summary AS summary
        ORDER BY id
        """
        with self._driver.session() as session:
            return [dict(record) for record in session.run(query)]

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (n)
        WHERE n.invalid_at IS NULL
          AND coalesce(n.id, n.canonical_key, n.community_id) = $id
        RETURN coalesce(n.id, n.canonical_key, n.community_id) AS id,
               CASE WHEN n:Community THEN 'Community' ELSE 'Entity' END AS label,
               n.label_original AS text, n.description AS description, n.summary AS summary
        LIMIT 1
        """
        with self._driver.session() as session:
            record = session.run(query, id=node_id).single()
            return dict(record) if record else None

    def get_graph_revision(self) -> str:
        import hashlib
        import json
        self._asegurar_conexion()
        query_nodes = """
        MATCH (n)
        WHERE n.invalid_at IS NULL
          AND any(label IN labels(n) WHERE label IN ['Entity', 'Literal', 'Blank'])
          AND NOT n:User AND NOT n:InformationObject AND NOT n:Community
        RETURN DISTINCT
            coalesce(n.id, n.canonical_key) AS id,
            labels(n) AS labels,
            coalesce(n.value, n.label_original, '') AS value
        ORDER BY id
        """
        query_edges = """
        MATCH (a)-[r:RELATION]->(b)
        WHERE r.invalid_at IS NULL
          AND any(label IN labels(a) WHERE label IN ['Entity', 'Literal', 'Blank'])
          AND any(label IN labels(b) WHERE label IN ['Entity', 'Literal', 'Blank'])
        RETURN
            coalesce(a.id,a.canonical_key) AS a,
            labels(a) AS a_labels,
            type(r) AS rel,
            coalesce(b.id,b.canonical_key) AS b,
            labels(b) AS b_labels,
            coalesce(r.io_id,'') AS io
        ORDER BY a, rel, b, io
        """
        with self._driver.session() as session:
            nodes = [r["id"] for r in session.run(query_nodes)]
            edges = [dict(r) for r in session.run(query_edges)]
        payload = {"nodes": nodes, "edges": edges}
        return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

    def salud_grafo(self) -> Dict[str, Any]:
        self._asegurar_conexion()
        queries = {
            "typed_overlap": """
                MATCH (n)
                WHERE size([l IN labels(n) WHERE l IN ['Entity','Literal','Blank']]) > 1
                RETURN count(n) AS value
            """,
            "missing_temporal_nodes": """
                MATCH (n)
                WHERE n.created_at IS NULL OR n.valid_at IS NULL
                RETURN count(n) AS value
            """,
            "missing_temporal_edges": """
                MATCH ()-[r]-()
                WHERE r.created_at IS NULL OR r.valid_at IS NULL
                RETURN count(r) AS value
            """,
            "unreachable_entities": """
                MATCH (e:Entity)
                WHERE NOT e:User AND NOT e:InformationObject
                  AND e.invalid_at IS NULL
                  AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(e) }
                RETURN count(e) AS value
            """,
            "eligible_without_active_community": """
                MATCH (e:Entity)
                WHERE NOT e:User AND NOT e:InformationObject
                  AND e.invalid_at IS NULL
                  AND NOT EXISTS {
                    MATCH (e)-[:IN_COMMUNITY]->(c:Community)
                    WHERE c.invalid_at IS NULL
                  }
                RETURN count(e) AS value
            """,
            "active_membership_to_invalid_community": """
                MATCH (:Entity)-[r:IN_COMMUNITY]->(c:Community)
                WHERE r.invalid_at IS NULL
                  AND c.invalid_at IS NOT NULL
                RETURN count(r) AS value
            """,
            "active_communities_without_members": """
                MATCH (c:Community)
                WHERE c.invalid_at IS NULL
                  AND NOT (c)<-[:IN_COMMUNITY]-(:Entity)
                RETURN count(c) AS value
            """,
        }
        checks = {}
        with self._driver.session() as session:
            for name, query in queries.items():
                rec = session.run(query).single()
                checks[name] = int(rec["value"] if rec else 0)
        checks["graph_revision"] = self.get_graph_revision()
        checks["theta_effective"] = False
        return checks

    def frecuencia(self, canonical_key: str) -> int:
        self._asegurar_conexion()
        query = """
        MATCH (e:Entity {canonical_key: $canonical_key})
        RETURN size(e.provenance) as freq
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, canonical_key=canonical_key)
                record = result.single()
                return record["freq"] if record and record["freq"] is not None else 0
        except Exception as e:
            raise Exception(f"Error consultando frecuencia: {str(e)}")

    def linea_temporal(self, desde: str, hasta: str) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (o)-[r:RELATION]->(d)
        WHERE r.created_at >= datetime($desde) AND r.created_at <= datetime($hasta)
        RETURN o.canonical_key as origen, r.type as relacion, d.canonical_key as destino, r.created_at as timestamp
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, desde=desde, hasta=hasta)
                return [{"origen": record["origen"], "relacion": record["relacion"], "destino": record["destino"], "timestamp": str(record["timestamp"])} for record in result]
        except Exception as e:
            raise Exception(f"Error consultando linea_temporal: {str(e)}")





    def publicar_comunidades(self, graph_revision: str, ts: str) -> None:
        """Publicación atómica de la partición preparada por reificar_comunidades."""
        self._asegurar_conexion()
        invalidate = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL AND c.published = true AND c.graph_revision <> $revision
        SET c.invalid_at = datetime($ts)
        WITH c
        OPTIONAL MATCH (c)-[r]-()
        WHERE r.invalid_at IS NULL AND (type(r) IN ['IN_COMMUNITY','PARENT_COMMUNITY'])
        SET r.invalid_at = datetime($ts)
        """
        publish = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL AND c.graph_revision = $revision
        SET c.published = true, c.published_at = datetime($ts)
        WITH c
        OPTIONAL MATCH (c)-[r:IN_COMMUNITY|PARENT_COMMUNITY]-()
        WHERE r.invalid_at IS NULL
        SET r.published = true
        """
        with self._driver.session() as session:
            with session.begin_transaction() as tx:
                tx.run(invalidate, revision=graph_revision, ts=ts)
                tx.run(publish, revision=graph_revision, ts=ts)
                tx.commit()

    def olvidar(self, io_id: str) -> str:
        """Eliminación determinista: borra IO, relaciones del IO, comunidades antiguas
        y entidades que ya no tienen ninguna procedencia activa. Devuelve una huella de acta."""
        import hashlib
        import json
        self._asegurar_conexion()
        with self._driver.session() as session:
            with session.begin_transaction() as tx:
                io = tx.run(
                    "MATCH (io:InformationObject {io_id:$id}) "
                    "RETURN io.io_id AS id, io.sha256 AS sha, "
                    "[ (io)-[:MENTIONS]->(e:Entity) | coalesce(e.id,e.canonical_key) ] AS entities",
                    id=io_id,
                ).single()
                if not io:
                    return hashlib.sha256(f"absent:{io_id}".encode()).hexdigest()

                entities = [e for e in (io["entities"] or []) if e]
                literal_rows = tx.run(
                    "MATCH (a)-[r:RELATION {io_id:$id}]->(l:Literal) "
                    "RETURN DISTINCT coalesce(l.id,l.canonical_key) AS id",
                    id=io_id,
                )
                literals = [row["id"] for row in literal_rows if row["id"]]

                tx.run("MATCH ()-[r:RELATION {io_id:$id}]-() DELETE r", id=io_id)
                tx.run("MATCH (io:InformationObject {io_id:$id}) DETACH DELETE io", id=io_id)
                tx.run(
                    "UNWIND $ids AS id MATCH (e:Entity {canonical_key:id}) "
                    "WHERE NOT (e)<-[:MENTIONS]-(:InformationObject) DETACH DELETE e",
                    ids=entities,
                )
                tx.run(
                    "UNWIND $ids AS id MATCH (l:Literal {canonical_key:id}) "
                    "WHERE NOT (l)<-[:RELATION]-() DETACH DELETE l",
                    ids=literals,
                )
                tx.run("MATCH (c:Community) DETACH DELETE c")
                tx.commit()
        return hashlib.sha256(
            json.dumps({"io_id": io_id, "sha256": io["sha"], "entities": sorted(entities)},
                       sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()

    def get_comunidades_vigentes(self) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL
        RETURN c.community_id AS community_id, c.level AS level, c.gamma AS gamma, c.theta AS theta, c.summary AS summary
        ORDER BY c.level ASC
        """
        comunidades = []
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query)
                for record in result:
                    comunidades.append(dict(record))
            return comunidades
        except Exception as e:
            raise Exception(f"Error consultando comunidades vigentes: {str(e)}")

    def get_comunidad_contexto(self, comunidad_id: str) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (c:Community {community_id: $cid})
        WHERE c.invalid_at IS NULL

        // 1. Obtener miembros (hojas) y relaciones internas evitando producto cartesiano usando WITH y UNION
        // Primero, sacamos solo los miembros y relaciones, y los agrupamos/procesamos,
        // o lo hacemos mediante llamadas separadas vía UNION para evitar multiplicación de filas.
        // Haremos UNION de resultados heterogéneos para mantener la firma (origen, destino, etc)
        // o devolverlos de manera controlada.

        // A: Miembros y sus relaciones internas (o solo miembros si no tienen relación)
        MATCH (e1:Entity)-[r1:IN_COMMUNITY]->(c)
        WHERE e1.invalid_at IS NULL AND r1.invalid_at IS NULL
        OPTIONAL MATCH (e1)-[rel:RELATION]->(e2:Entity)-[r2:IN_COMMUNITY]->(c)
        WHERE rel.invalid_at IS NULL AND e2.invalid_at IS NULL AND r2.invalid_at IS NULL
        RETURN
            e1.id AS origen_id,
            e1.canonical_key AS origen_desc,
            e2.id AS destino_id,
            e2.canonical_key AS destino_desc,
            type(rel) AS relacion_interna,
            null AS child_id,
            null AS child_summary

        UNION ALL

        // B: Subcomunidades (hijas)
        MATCH (child:Community)-[r_parent:PARENT_COMMUNITY]->(c:Community {community_id: $cid})
        WHERE child.invalid_at IS NULL AND c.invalid_at IS NULL AND r_parent.invalid_at IS NULL
        RETURN
            null AS origen_id,
            null AS origen_desc,
            null AS destino_id,
            null AS destino_desc,
            null AS relacion_interna,
            child.community_id AS child_id,
            child.summary AS child_summary
        """
        contexto = []
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, cid=comunidad_id)
                for record in result:
                    contexto.append(dict(record))
            return contexto
        except Exception as e:
            raise Exception(f"Error consultando contexto de comunidad {comunidad_id}: {str(e)}")

    def set_resumen_comunidad(self, comunidad_id: str, summary: str) -> None:
        self._asegurar_conexion()
        query = """
        MATCH (c:Community {community_id: $cid})
        WHERE c.invalid_at IS NULL
        SET c.summary = $summary
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                session.run(query, cid=comunidad_id, summary=summary)
        except Exception as e:
            raise Exception(f"Error guardando resumen de comunidad {comunidad_id}: {str(e)}")

    def reificar_comunidades(self, comunidades, io_id: str, ts: str, graph_revision: str | None = None) -> None:
        self._asegurar_conexion()

        query_community = """
        UNWIND $communities AS comm
        CREATE (c:Community {community_id: comm.cid})
        SET c.level = comm.level,
            c.gamma = comm.gamma,
            c.theta = comm.theta,
            c.graph_revision = $graph_revision,
            c.member_fingerprint = comm.member_fingerprint,
            c.summary_placeholder = true,
            c.published = false,
            c.created_at = datetime($ts),
            c.valid_at = datetime($ts),
            c.invalid_at = null
        """

        query_member = """
        UNWIND $members AS m
        MATCH (e:Entity {canonical_key: m.entity_id})
        MATCH (c:Community {community_id: m.community_id})
        WHERE c.invalid_at IS NULL AND e.invalid_at IS NULL
        CREATE (e)-[r:IN_COMMUNITY {io_id: $io_id, published:false}]->(c)
        SET r.created_at = datetime($ts),
            r.valid_at = datetime($ts),
            r.invalid_at = null
        """

        query_parent = """
        UNWIND $parents AS p
        MATCH (child:Community {community_id: p.child_id})
        MATCH (parent:Community {community_id: p.parent_id})
        WHERE child.invalid_at IS NULL AND parent.invalid_at IS NULL
        CREATE (child)-[r:PARENT_COMMUNITY {io_id: $io_id, published:false}]->(parent)
        SET r.created_at = datetime($ts),
            r.valid_at = datetime($ts),
            r.invalid_at = null
        """

        communities_list = []
        members_list = []
        parents_list = []

        for cid, info in comunidades.estructura.items():
            communities_list.append({
                "cid": cid,
                "level": info["level"],
                "gamma": info["gamma"],
                "theta": info["theta"],
                "member_fingerprint": info["member_fingerprint"]
            })
            for m in info["miembros"]:
                members_list.append({
                    "entity_id": m,
                    "community_id": cid
                })
            if info["parent"]:
                parents_list.append({
                    "child_id": cid,
                    "parent_id": info["parent"]
                })

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    if communities_list:
                        tx.run(query_community, communities=communities_list, ts=ts, graph_revision=graph_revision or "unknown")
                    if members_list:
                        tx.run(query_member, members=members_list, io_id=io_id, ts=ts)
                    if parents_list:
                        tx.run(query_parent, parents=parents_list, io_id=io_id, ts=ts)
                    tx.commit()
        except Exception as e:
            raise Exception(f"Error en reificar_comunidades: {str(e)}")


# Canonical atomic ingest implementation.  Defined at module end so legacy
# implementations cannot bypass the typed/bitemporal/reachability guards.
def _asentar_transaccional_canonico(
    self,
    entidades: List[Dict[str, Any]],
    relaciones: List[Dict[str, Any]],
    source_triplet: Dict[str, Any],
    io_id: str,
    timestamp: str,
) -> int:
    self._asegurar_conexion()
    if not io_id:
        raise ValueError(
            "io_id ausente: el asentamiento exige el identificador del Objeto de Información."
        )

    query_entidades = """
    UNWIND $entidades AS e
    MERGE (n:Entity {canonical_key: e.canonical_key})
    ON CREATE SET
        n.id = e.canonical_key,
        n.label_original = e.label_original,
        n.embedding = e.embedding,
        n.provenance = [e.provenance_raw],
        n.event_time = e.event_time,
        n.capture_time = e.capture_time,
        n.custody = e.custody,
        n.needs_review = e.needs_review,
        n.created_at = datetime($ts),
        n.valid_at = datetime($ts),
        n.invalid_at = null
    ON MATCH SET
        n.provenance = n.provenance + [e.provenance_raw]
    """

    query_relaciones_entity = """
    UNWIND $relaciones AS rel_data
    MATCH (origen:Entity {canonical_key: rel_data.origen_id})
    MATCH (destino:Entity {canonical_key: rel_data.destino_id})
    MERGE (origen)-[r:RELATION {type: rel_data.relacion, io_id: $io_id}]->(destino)
    ON CREATE SET
        r.provenance = [rel_data.provenance],
        r.event_time = rel_data.event_time,
        r.capture_time = rel_data.capture_time,
        r.custody = rel_data.custody,
        r.created_at = datetime($ts),
        r.valid_at = datetime($ts),
        r.invalid_at = null
    ON MATCH SET
        r.provenance = r.provenance + [rel_data.provenance]
    RETURN count(r) AS count
    """

    query_relaciones_literal = """
    UNWIND $relaciones AS rel_data
    MATCH (origen:Entity {canonical_key: rel_data.origen_id})
    MERGE (destino:Literal {canonical_key: 'literal:' + rel_data.destino_id})
    ON CREATE SET
        destino.id = 'literal:' + rel_data.destino_id,
        destino.value = rel_data.literal_value,
        destino.datatype = rel_data.literal_datatype,
        destino.created_at = datetime($ts),
        destino.valid_at = datetime($ts),
        destino.invalid_at = null
    ON MATCH SET
        destino.value = rel_data.literal_value,
        destino.datatype = rel_data.literal_datatype
    MERGE (origen)-[r:RELATION {type: rel_data.relacion, io_id: $io_id}]->(destino)
    ON CREATE SET
        r.provenance = [rel_data.provenance],
        r.event_time = rel_data.event_time,
        r.capture_time = rel_data.capture_time,
        r.custody = rel_data.custody,
        r.created_at = datetime($ts),
        r.valid_at = datetime($ts),
        r.invalid_at = null
    ON MATCH SET
        r.provenance = r.provenance + [rel_data.provenance]
    RETURN count(r) AS count
    """

    anclaje_query = """
    MERGE (u:Entity:User {id:'root'})
    ON CREATE SET
        u.canonical_key = 'root',
        u.created_at = datetime($ts),
        u.valid_at = datetime($ts),
        u.invalid_at = null
    MERGE (io:InformationObject {canonical_key:$io_key})
    ON CREATE SET
        io.io_id=$io_id,
        io.provenance=[$prov_str],
        io.metadata_json=$metadata_json,
        io.source_schema=$source_schema,
        io.event_time=$event_time,
        io.capture_time=$capture_time,
        io.custody=$custody,
        io.created_at=datetime($ts),
        io.valid_at=datetime($ts),
        io.invalid_at=null,
        io.volcado_id=$volcado_id,
        io.version=$version,
        io.sha256=$sha256
    ON MATCH SET io.provenance = io.provenance + [$prov_str]
    MERGE (u)-[owns:OWNS {io_id:$io_id}]->(io)
    ON CREATE SET
        owns.created_at=datetime($ts),
        owns.valid_at=datetime($ts),
        owns.invalid_at=null
    WITH io
    UNWIND $claves AS clave
    MERGE (e:Entity {canonical_key: clave})
    ON CREATE SET
        e.id=clave,
        e.created_at=datetime($ts),
        e.valid_at=datetime($ts),
        e.invalid_at=null
    MERGE (io)-[m:MENTIONS {io_id:$io_id}]->(e)
    ON CREATE SET
        m.created_at=datetime($ts),
        m.valid_at=datetime($ts),
        m.invalid_at=null
    RETURN count(m) AS anclados
    """

    restriccion_query = """
    MATCH (n)
    WHERE size([l IN labels(n) WHERE l IN ['Entity','Literal','Blank']]) > 1
    RETURN count(n) AS violaciones
    """

    campos_faltantes_query = """
    MATCH (n)
    WHERE n.valid_at IS NULL OR n.created_at IS NULL
    RETURN count(n) AS nodos_invalidos
    UNION ALL
    MATCH ()-[r]->()
    WHERE r.valid_at IS NULL OR r.created_at IS NULL
    RETURN count(r) AS nodos_invalidos
    """

    check_huerfanos = """
    UNWIND $claves AS clave
    MATCH (n)
    WHERE any(l IN labels(n) WHERE l IN ['Entity','Literal','Blank'])
      AND coalesce(n.canonical_key, n.id) = clave
      AND NOT (n:User AND n.id='root')
      AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) }
    RETURN collect(DISTINCT n.canonical_key) AS huerfanos
    """

    check_huerfanos_global = """
    MATCH (n)
    WHERE any(l IN labels(n) WHERE l IN ['Entity','Literal','Blank'])
      AND NOT (n:User AND n.id='root')
      AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) }
    RETURN count(n) AS orphans
    """

    try:
        assert self._driver is not None
        with self._driver.session() as session:
            with session.begin_transaction() as tx:
                ts = timestamp
                io_key = 'io:' + io_id
                prov_str_io = (
                    f"asentamiento=p5b, origen={source_triplet.get('origen','')}, "
                    f"driver={source_triplet.get('driver','')}, timestamp={ts}"
                )

                volcado = source_triplet.get("volcado_id")
                version = (
                    int(source_triplet["version"])
                    if source_triplet.get("version") is not None else None
                )
                sha256 = source_triplet.get("sha256")

                if volcado:
                    existente = tx.run(
                        "MATCH (io:InformationObject {io_id:$io}) "
                        "RETURN io.volcado_id AS v, io.version AS ver, io.sha256 AS s",
                        io=io_id,
                    ).single()
                    if existente:
                        if (
                            existente["v"] == volcado
                            and existente["ver"] == version
                            and existente["s"] == sha256
                        ):
                            return 0
                        raise Exception(f"Conflicto terna io_id={io_id}")

                if entidades:
                    tx.run(query_entidades, entidades=entidades, ts=ts)

                relaciones_entity = [
                    r for r in relaciones
                    if str(r.get("object_kind", "entity")).lower() != "literal"
                ]
                relaciones_literal = [
                    r for r in relaciones
                    if str(r.get("object_kind", "")).lower() == "literal"
                ]

                escritos = 0
                if relaciones_entity:
                    record = tx.run(
                        query_relaciones_entity,
                        relaciones=relaciones_entity,
                        io_id=io_id,
                        ts=ts,
                    ).single()
                    escritos += int(record["count"]) if record else 0

                if relaciones_literal:
                    record = tx.run(
                        query_relaciones_literal,
                        relaciones=relaciones_literal,
                        io_id=io_id,
                        ts=ts,
                    ).single()
                    escritos += int(record["count"]) if record else 0

                claves_entity = {e["canonical_key"] for e in entidades}
                claves_entity.update(r["origen_id"] for r in relaciones)
                claves_entity.update(
                    r["destino_id"] for r in relaciones_entity
                )
                claves_anchor = sorted(claves_entity)

                if claves_anchor:
                    tx.run(
                        anclaje_query,
                        ts=ts,
                        io_id=io_id,
                        io_key=io_key,
                        prov_str=prov_str_io,
                        claves=claves_anchor,
                        volcado_id=volcado,
                        version=version,
                        sha256=sha256,
                        metadata_json=json.dumps(
                            source_triplet.get("metadata") or {},
                            ensure_ascii=False,
                            sort_keys=True,
                        ),
                        source_schema=source_triplet.get("source_schema"),
                        event_time=source_triplet.get("event_time"),
                        capture_time=source_triplet.get("capture_time"),
                        custody=source_triplet.get("custody"),
                    )

                res_viol = tx.run(restriccion_query)
                viol_count = sum(int(row[0]) for row in res_viol)
                if viol_count > 0:
                    tx.rollback()
                    raise ValueError(
                        "Violación de restricción real: nodo con doble clase "
                        "(Entity, Literal, Blank)."
                    )

                res_bitemp = tx.run(campos_faltantes_query)
                missing_count = sum(int(row[0]) for row in res_bitemp)
                if missing_count > 0:
                    tx.rollback()
                    raise ValueError(
                        "Violación de restricción bi-temporal: "
                        "valid_at, invalid_at o created_at faltante."
                    )

                reachability_keys = set(claves_anchor)
                reachability_keys.update(
                    (
                        "literal:" + str(r["destino_id"])
                        if str(r.get("object_kind", "")).lower() == "literal"
                        else str(r["destino_id"])
                    )
                    for r in relaciones
                )
                orphans_record = tx.run(
                    check_huerfanos,
                    claves=sorted(reachability_keys),
                ).single()
                huerfanos = (
                    orphans_record["huerfanos"]
                    if orphans_record else []
                )
                if huerfanos:
                    tx.rollback()
                    raise HuerfanosDetectadosError(
                        io_id=io_id,
                        huerfanos=huerfanos,
                    )

                global_record = tx.run(check_huerfanos_global).single()
                if global_record and int(global_record["orphans"]) > 0:
                    logging.warning(
                        "GRAFO-01: %s nodo(s) huérfano(s) heredados en el grafo "
                        "(NO bloquean esta ingesta).",
                        int(global_record["orphans"]),
                    )

                tx.commit()

                # Post-commit audit: the causal hook must observe the same committed graph.
                with self._driver.session() as verify_session:
                    counts = verify_session.run(
                        """
                        MATCH (e:Entity)
                        WHERE NOT e:User AND NOT e:InformationObject
                        RETURN count(e) AS entities
                        """
                    ).single()
                    relation_counts = verify_session.run(
                        """
                        MATCH ()-[r:RELATION]->()
                        RETURN count(r) AS relations
                        """
                    ).single()
                    logging.info(
                        "[INGESTA] postcommit io=%s entities=%s relations=%s",
                        io_id,
                        int(counts["entities"] if counts else 0),
                        int(relation_counts["relations"] if relation_counts else 0),
                    )
                return escritos
    except (ValueError, IngestaFallidaError):
        raise
    except Exception as exc:
        raise Exception(
            f"Error en asentamiento transaccional único: {str(exc)}"
        ) from exc


Neo4jMemoriaOrganizada.asentar_transaccional = _asentar_transaccional_canonico

# Staged reification: old published partition remains visible until publish.
def _reificar_comunidades_staged(
    self, comunidades, io_id: str, ts: str, graph_revision: str | None = None
) -> None:
    self._asegurar_conexion()

    query_community = """
    UNWIND $communities AS comm
    CREATE (c:Community {community_id: comm.cid})
    SET c.level = comm.level,
        c.gamma = comm.gamma,
        c.theta = comm.theta,
        c.graph_revision = $graph_revision,
        c.member_fingerprint = comm.member_fingerprint,
        c.summary_placeholder = true,
        c.published = false,
        c.created_at = datetime($ts),
        c.valid_at = datetime($ts),
        c.invalid_at = null
    """

    query_member = """
    UNWIND $members AS m
    MATCH (e:Entity {canonical_key: m.entity_id})
    MATCH (c:Community {
        community_id: m.community_id,
        graph_revision: $graph_revision
    })
    WHERE c.invalid_at IS NULL AND e.invalid_at IS NULL
    CREATE (e)-[r:IN_COMMUNITY {io_id: $io_id, published:false}]->(c)
    SET r.created_at = datetime($ts),
        r.valid_at = datetime($ts),
        r.invalid_at = null
    """

    query_parent = """
    UNWIND $parents AS p
    MATCH (child:Community {
        community_id: p.child_id,
        graph_revision: $graph_revision
    })
    MATCH (parent:Community {
        community_id: p.parent_id,
        graph_revision: $graph_revision
    })
    WHERE child.invalid_at IS NULL AND parent.invalid_at IS NULL
    CREATE (child)-[r:PARENT_COMMUNITY {io_id: $io_id, published:false}]->(parent)
    SET r.created_at = datetime($ts),
        r.valid_at = datetime($ts),
        r.invalid_at = null
    """

    communities_list = []
    members_list = []
    parents_list = []

    for cid, info in comunidades.estructura.items():
        communities_list.append({
            "cid": cid,
            "level": info["level"],
            "gamma": info["gamma"],
            "theta": info["theta"],
            "member_fingerprint": info["member_fingerprint"],
        })
        for member in info["miembros"]:
            members_list.append({
                "entity_id": member,
                "community_id": cid,
            })
        if info["parent"]:
            parents_list.append({
                "child_id": cid,
                "parent_id": info["parent"],
            })

    assert self._driver is not None
    try:
        with self._driver.session() as session:
            with session.begin_transaction() as tx:
                if communities_list:
                    tx.run(
                        query_community,
                        communities=communities_list,
                        ts=ts,
                        graph_revision=graph_revision or "unknown",
                    )
                if members_list:
                    tx.run(
                        query_member,
                        members=members_list,
                        io_id=io_id,
                        ts=ts,
                        graph_revision=graph_revision or "unknown",
                    )
                if parents_list:
                    tx.run(
                        query_parent,
                        parents=parents_list,
                        io_id=io_id,
                        ts=ts,
                        graph_revision=graph_revision or "unknown",
                    )
                tx.commit()
    except Exception as exc:
        raise Exception(f"Error en reificación staged: {exc}") from exc


Neo4jMemoriaOrganizada.reificar_comunidades = _reificar_comunidades_staged


# Deterministic deletion fence: no stale vector/manifest artifacts remain queryable.
def _olvidar_canonico(self, io_id: str) -> str:
    import hashlib
    from pathlib import Path

    from khora_kernel.embeddings import (
        INDEX_FILE as _INDEX_FILE,
    )
    from khora_kernel.embeddings import (
        MAP_FILE as _MAP_FILE,
    )
    from khora_kernel.embeddings import (
        META_FILE as _META_FILE,
    )
    from khora_kernel.embeddings import (
        TEXT_FILE as _TEXT_FILE,
    )
    from khora_kernel.embeddings import (
        invalidate_index as _invalidate_index,
    )
    from khora_kernel.embeddings import (
        rebuild_index as _rebuild_index,
    )

    self._asegurar_conexion()
    _invalidate_index()

    try:
        with self._driver.session() as session:
            with session.begin_transaction() as tx:
                io = tx.run(
                    "MATCH (io:InformationObject {io_id:$id}) "
                    "RETURN io.io_id AS id, io.sha256 AS sha, "
                    "[ (io)-[:MENTIONS]->(e:Entity) | "
                    "coalesce(e.id,e.canonical_key) ] AS entities",
                    id=io_id,
                ).single()

                if not io:
                    tx.rollback()
                    try:
                        _rebuild_index(self, self.get_graph_revision())
                    except Exception:
                        pass
                    return hashlib.sha256(
                        f"absent:{io_id}".encode()
                    ).hexdigest()

                entities = [
                    e for e in (io["entities"] or []) if e
                ]
                literal_rows = tx.run(
                    "MATCH (a)-[r:RELATION {io_id:$id}]->(l:Literal) "
                    "RETURN DISTINCT coalesce(l.id,l.canonical_key) AS id",
                    id=io_id,
                )
                literals = [
                    row["id"] for row in literal_rows if row["id"]
                ]

                tx.run(
                    "MATCH ()-[r:RELATION {io_id:$id}]-() DELETE r",
                    id=io_id,
                )
                tx.run(
                    "MATCH (io:InformationObject {io_id:$id}) "
                    "DETACH DELETE io",
                    id=io_id,
                )
                tx.run(
                    "UNWIND $ids AS id "
                    "MATCH (e:Entity {canonical_key:id}) "
                    "WHERE NOT (e)<-[:MENTIONS]-(:InformationObject) "
                    "DETACH DELETE e",
                    ids=entities,
                )
                tx.run(
                    "UNWIND $ids AS id "
                    "MATCH (l:Literal {canonical_key:id}) "
                    "WHERE NOT (l)<-[:RELATION]-() "
                    "DETACH DELETE l",
                    ids=literals,
                )
                tx.run("MATCH (c:Community) DETACH DELETE c")
                tx.commit()

        manifest_dir = Path("data/epistwin")
        if manifest_dir.exists():
            for path in manifest_dir.glob("*.json"):
                try:
                    path.unlink()
                except OSError:
                    pass

        try:
            _rebuild_index(self, self.get_graph_revision())
        except Exception:
            # Nunca dejar un índice viejo utilizable.
            for path in (_INDEX_FILE, _MAP_FILE, _META_FILE, _TEXT_FILE):
                try:
                    path.unlink()
                except OSError:
                    pass

        return hashlib.sha256(
            json.dumps(
                {
                    "io_id": io_id,
                    "sha256": io["sha"],
                    "entities": sorted(entities),
                    "literals": sorted(literals),
                },
                sort_keys=True,
                separators=(",", ":"),
            ).encode()
        ).hexdigest()

    except Exception:
        # Si la transacción revirtió, regeneramos el índice sobre el grafo intacto.
        try:
            _rebuild_index(self, self.get_graph_revision())
        except Exception:
            pass
        raise


Neo4jMemoriaOrganizada.olvidar = _olvidar_canonico


def _cerrar(self) -> None:
    if self._driver is not None:
        self._driver.close()
        self._driver = None


Neo4jMemoriaOrganizada.cerrar = _cerrar
