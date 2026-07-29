# @l0 L0-002-R · @req ING-03/REQ-1,GRAFO-01/REQ-1 · @acr ACR-1.1,ACR-1.2 · @ua UA-03,UA-04,UA-05,UA-06
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

        rel_query = """
        # Restricción transaccional G=(N,R,T) N_e, L, B
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

    def escribir_ingesta(self, triples: List[Triple], provenance: Provenance, io_id=None) -> int:
        self._asegurar_conexion()
        if not provenance:
            raise Exception("No se puede escribir sin provenance.")

        if not io_id:
            raise ValueError('io_id ausente: la escritura exige el identificador del Objeto de Informacion (ACR-1.2).')

        # En la ingesta actual los nodos se asumen como Entity
        query = """
        UNWIND $triples as t

        MERGE (origen:Entity {canonical_key: t.origen_id})
        ON CREATE SET
            origen.created_at = datetime(), origen.valid_at = datetime(), origen.invalid_at = null

        MERGE (destino:Entity {canonical_key: t.destino_id})
        ON CREATE SET
            destino.created_at = datetime(), destino.valid_at = datetime(), destino.invalid_at = null

        MERGE (origen)-[r:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
        ON CREATE SET
            r.provenance = [t.provenance_str],
            r.created_at = datetime(),
            r.valid_at = datetime(),
            r.invalid_at = null
        ON MATCH SET
            r.provenance = r.provenance + [t.provenance_str]

        RETURN count(r) as count
        """

        check_huerfanos = """
        UNWIND $claves AS clave
        MATCH (n:Entity {canonical_key: clave})
        WHERE 1=1
          AND NOT (n:User AND n.id='root')
          AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) }
        RETURN collect(DISTINCT n.canonical_key) AS huerfanos
        """

        check_huerfanos_global = """
        MATCH (n:Entity)
        WHERE 1=1
          AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
          AND NOT (n:User AND n.id = 'root')
        RETURN count(n) as orphans
        """

        anclaje_query = """
        MERGE (u:Entity:User {id:'root'})
        ON CREATE SET u.canonical_key='root', u.created_at=datetime($ts),
                      u.valid_at=datetime($ts), u.invalid_at=null
        MERGE (io:Entity:InformationObject {canonical_key:$io_key})
        ON CREATE SET io.io_id=$io_id, io.provenance=[$prov_str],
                      io.created_at=datetime($ts), io.valid_at=datetime($ts), io.invalid_at=null
        ON MATCH SET io.provenance = io.provenance + [$prov_str]
        MERGE (u)-[owns:OWNS {io_id:$io_id}]->(io)
        ON CREATE SET owns.created_at=datetime($ts), owns.valid_at=datetime($ts), owns.invalid_at=null
        WITH io
        UNWIND $claves AS clave
        MERGE (e:Entity {canonical_key: clave})
        ON CREATE SET e.created_at=datetime($ts), e.valid_at=datetime($ts), e.invalid_at=null
        MERGE (io)-[m:MENTIONS {io_id:$io_id}]->(e)
        ON CREATE SET m.created_at=datetime($ts), m.valid_at=datetime($ts), m.invalid_at=null
        RETURN count(m) AS anclados
        """

        restriccion_query = """
        MATCH (n)
        WHERE size([l IN labels(n) WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        campos_faltantes_query = """
        MATCH (n)
        WHERE n.valid_at IS NULL OR n.created_at IS NULL
        RETURN count(n) as nodos_invalidos
        UNION ALL
        MATCH ()-[r]->()
        WHERE r.valid_at IS NULL OR r.created_at IS NULL
        RETURN count(r) as nodos_invalidos
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    import datetime
                    ts = getattr(provenance, "timestamp", None)
                    if not ts:
                        ts = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                    prov_str_io = f"origen={provenance.origen}, driver={provenance.driver}, timestamp={ts}"
                    io_key = 'io:' + io_id

                    triples_data = []
                    claves_set = set()
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })
                        claves_set.add(t.origen_id)
                        claves_set.add(t.destino_id)
                    claves_list = list(claves_set)

                    result = tx.run(query, triples=triples_data, io_id=io_id)
                    record = result.single()
                    escritos = record["count"] if record else 0

                    tx.run(anclaje_query, ts=ts, io_id=io_id, io_key=io_key, prov_str=prov_str_io, claves=claves_list)

                    # Verificar Unión Disjunta
                    res_viol = tx.run(restriccion_query)
                    viol_count = sum([r[0] for r in res_viol])
                    if viol_count > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción real: nodo con doble clase (Entity, Literal, Blank).")

                    # Verificar Bi-temporal
                    res_bitemp = tx.run(campos_faltantes_query)
                    invalidos = sum([r[0] for r in res_bitemp])
                    if invalidos > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción bi-temporal: valid_at, invalid_at o created_at faltante.")

                    # Verificar Alcanzabilidad Scoped
                    orphans_result = tx.run(check_huerfanos, claves=claves_list)
                    orphans_record = orphans_result.single()
                    huerfanos_list = orphans_record["huerfanos"] if orphans_record else []
                    if huerfanos_list:
                        tx.rollback()
                        raise HuerfanosDetectadosError(io_id=io_id, huerfanos=huerfanos_list)

                    # Verificar Alcanzabilidad Global Diagnóstico
                    global_result = tx.run(check_huerfanos_global)
                    global_record = global_result.single()
                    if global_record and global_record["orphans"] > 0:
                        import logging
                        logging.warning(
                            "GRAFO-01: %s nodo(s) huérfano(s) heredados en el grafo (NO bloquean esta ingesta). "
                            "Remediar con scripts/migraciones/2026_07_28_grafo01_backfill_alcanzabilidad.py",
                            global_record["orphans"]
                        )

                    tx.commit()
                    return escritos
        except (ValueError, IngestaFallidaError) as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en escribir_ingesta: {str(e)}")


    def fusionar_ingesta(self, triples: List[Triple], provenance: Provenance, io_id=None) -> int:
        self._asegurar_conexion()
        if not provenance:
            raise Exception("No se puede escribir sin provenance.")

        if not io_id:
            raise ValueError('io_id ausente: la escritura exige el identificador del Objeto de Informacion (ACR-1.2).')
        ts_valid_at = provenance.timestamp

        # ACR-1.1 & ACR-1.2 logic:
        # Bitemporal edge upsert ⊕
        query = """
        UNWIND $triples as t

        MERGE (origen:Entity {canonical_key: t.origen_id})
        ON CREATE SET
            origen.created_at = datetime($ts), origen.valid_at = datetime($ts), origen.invalid_at = null

        MERGE (destino:Entity {canonical_key: t.destino_id})
        ON CREATE SET
            destino.created_at = datetime($ts), destino.valid_at = datetime($ts), destino.invalid_at = null

        // Buscamos si existe la relación activa (invalid_at is null) con los mismos datos base
        OPTIONAL MATCH (origen)-[r_act:RELATION {type: t.relacion}]->(destino)
        WHERE r_act.invalid_at IS NULL

        // Validar si la relacion activa ya tiene exactamente los mismos atributos (idempotencia)
        // Para simplificar, comparamos si ya existe y si el provenance_str ya está en su arreglo
        // Pero bitemporal indica que si el atributo cambia se versiona.
        // Aquí si la arista existe y no tiene el provenance_str, lo agregamos y creamos version nueva.
        // Si ya lo tiene, no hacemos nada.

        WITH t, origen, destino, r_act,
             CASE
               WHEN r_act IS NULL THEN 'CREATE'
               WHEN t.provenance_str IN r_act.provenance THEN 'IGNORE'
               ELSE 'UPDATE'
             END as action

        // 1. CREATE nueva relacion
        FOREACH (ignore IN CASE WHEN action = 'CREATE' THEN [1] ELSE [] END |
            CREATE (origen)-[r_new:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
            SET r_new.provenance = [t.provenance_str],
                r_new.created_at = datetime($ts),
                r_new.valid_at = datetime($ts),
                r_new.invalid_at = null
        )

        // 2. UPDATE (invalidar vieja, crear nueva)
        FOREACH (ignore IN CASE WHEN action = 'UPDATE' THEN [1] ELSE [] END |
            SET r_act.invalid_at = datetime($ts)
            CREATE (origen)-[r_new:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
            SET r_new.provenance = r_act.provenance + [t.provenance_str],
                r_new.created_at = r_act.created_at,
                r_new.valid_at = datetime($ts),
                r_new.invalid_at = null
        )
        """

        check_huerfanos = """
        UNWIND $claves AS clave
        MATCH (n:Entity {canonical_key: clave})
        WHERE 1=1
          AND NOT (n:User AND n.id='root')
          AND NOT EXISTS { MATCH (:User {id:'root'})-[*]->(n) }
        RETURN collect(DISTINCT n.canonical_key) AS huerfanos
        """

        check_huerfanos_global = """
        MATCH (n:Entity)
        WHERE 1=1
          AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
          AND NOT (n:User AND n.id = 'root')
        RETURN count(n) as orphans
        """

        anclaje_query = """
        MERGE (u:Entity:User {id:'root'})
        ON CREATE SET u.canonical_key='root', u.created_at=datetime($ts),
                      u.valid_at=datetime($ts), u.invalid_at=null
        MERGE (io:Entity:InformationObject {canonical_key:$io_key})
        ON CREATE SET io.io_id=$io_id, io.provenance=[$prov_str],
                      io.created_at=datetime($ts), io.valid_at=datetime($ts), io.invalid_at=null
        ON MATCH SET io.provenance = io.provenance + [$prov_str]
        MERGE (u)-[owns:OWNS {io_id:$io_id}]->(io)
        ON CREATE SET owns.created_at=datetime($ts), owns.valid_at=datetime($ts), owns.invalid_at=null
        WITH io
        UNWIND $claves AS clave
        MERGE (e:Entity {canonical_key: clave})
        ON CREATE SET e.created_at=datetime($ts), e.valid_at=datetime($ts), e.invalid_at=null
        MERGE (io)-[m:MENTIONS {io_id:$io_id}]->(e)
        ON CREATE SET m.created_at=datetime($ts), m.valid_at=datetime($ts), m.invalid_at=null
        RETURN count(m) AS anclados
        """

        restriccion_query = """
        MATCH (n)
        WHERE size([l IN labels(n) WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        campos_faltantes_query = """
        MATCH (n)
        WHERE n.valid_at IS NULL OR n.created_at IS NULL
        RETURN count(n) as nodos_invalidos
        UNION ALL
        MATCH ()-[r]->()
        WHERE r.valid_at IS NULL OR r.created_at IS NULL
        RETURN count(r) as nodos_invalidos
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    import datetime
                    ts = getattr(provenance, "timestamp", None)
                    if not ts:
                        ts = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                    prov_str_io = f"origen={provenance.origen}, driver={provenance.driver}, timestamp={ts}"
                    io_key = 'io:' + io_id

                    triples_data = []
                    claves_set = set()
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })
                        claves_set.add(t.origen_id)
                        claves_set.add(t.destino_id)
                    claves_list = list(claves_set)

                    result = tx.run(query, triples=triples_data, io_id=io_id, ts=ts_valid_at)
                    summary = result.consume()
                    escritos = summary.counters.nodes_created + summary.counters.relationships_created + summary.counters.properties_set

                    tx.run(anclaje_query, ts=ts, io_id=io_id, io_key=io_key, prov_str=prov_str_io, claves=claves_list)

                    # Verificar Unión Disjunta
                    res_viol = tx.run(restriccion_query)
                    viol_count = sum([r[0] for r in res_viol])
                    if viol_count > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción real: nodo con doble clase (Entity, Literal, Blank).")

                    # Verificar Bi-temporal
                    res_bitemp = tx.run(campos_faltantes_query)
                    invalidos = sum([r[0] for r in res_bitemp])
                    if invalidos > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción bi-temporal: valid_at, invalid_at o created_at faltante.")

                    # Verificar Alcanzabilidad Scoped
                    orphans_result = tx.run(check_huerfanos, claves=claves_list)
                    orphans_record = orphans_result.single()
                    huerfanos_list = orphans_record["huerfanos"] if orphans_record else []
                    if huerfanos_list:
                        tx.rollback()
                        raise HuerfanosDetectadosError(io_id=io_id, huerfanos=huerfanos_list)

                    # Verificar Alcanzabilidad Global Diagnóstico
                    global_result = tx.run(check_huerfanos_global)
                    global_record = global_result.single()
                    if global_record and global_record["orphans"] > 0:
                        import logging
                        logging.warning(
                            "GRAFO-01: %s nodo(s) huérfano(s) heredados en el grafo (NO bloquean esta ingesta). "
                            "Remediar con scripts/migraciones/2026_07_28_grafo01_backfill_alcanzabilidad.py",
                            global_record["orphans"]
                        )

                    tx.commit()
                    return escritos
        except (ValueError, IngestaFallidaError) as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en fusionar_ingesta: {str(e)}")

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

    def reificar_comunidades(self, comunidades, io_id: str, ts: str) -> None:
        self._asegurar_conexion()

        # We need to invalidate previous communities and their relations
        query_invalidate = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL
        SET c.invalid_at = datetime($ts)
        WITH c
        OPTIONAL MATCH (c)-[r]-()
        WHERE r.invalid_at IS NULL AND (type(r) = 'IN_COMMUNITY' OR type(r) = 'PARENT_COMMUNITY')
        SET r.invalid_at = datetime($ts)
        """

        query_community = """
        UNWIND $communities AS comm
        CREATE (c:Community {community_id: comm.cid})
        SET c.level = comm.level,
            c.gamma = comm.gamma,
            c.theta = comm.theta,
            c.summary_placeholder = true,
            c.created_at = datetime($ts),
            c.valid_at = datetime($ts),
            c.invalid_at = null
        """

        query_member = """
        UNWIND $members AS m
        MATCH (e:Entity {id: m.entity_id})
        MATCH (c:Community {community_id: m.community_id})
        WHERE c.invalid_at IS NULL AND e.invalid_at IS NULL
        CREATE (e)-[r:IN_COMMUNITY {io_id: $io_id}]->(c)
        SET r.created_at = datetime($ts),
            r.valid_at = datetime($ts),
            r.invalid_at = null
        """

        query_parent = """
        UNWIND $parents AS p
        MATCH (child:Community {community_id: p.child_id})
        MATCH (parent:Community {community_id: p.parent_id})
        WHERE child.invalid_at IS NULL AND parent.invalid_at IS NULL
        CREATE (child)-[r:PARENT_COMMUNITY {io_id: $io_id}]->(parent)
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
                "theta": info["theta"]
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
                    tx.run(query_invalidate, ts=ts)
                    if communities_list:
                        tx.run(query_community, communities=communities_list, ts=ts)
                    if members_list:
                        tx.run(query_member, members=members_list, io_id=io_id, ts=ts)
                    if parents_list:
                        tx.run(query_parent, parents=parents_list, io_id=io_id, ts=ts)
                    tx.commit()
        except Exception as e:
            raise Exception(f"Error en reificar_comunidades: {str(e)}")
