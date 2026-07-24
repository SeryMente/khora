# @l0 L0-002-R · @req PKG-00/REQ-1 · @acr ACR-1.1
# @ua UA-01, UA-02, UA-03, UA-04
from typing import Any, Dict, List, Optional

from neo4j import GraphDatabase

from khora_kernel.api import Provenance, Triple


class IngestaFallidaError(Exception):
    pass

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

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: List[float], matiz_de: Optional[str] = None, needs_review: bool = False) -> None:
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
        MATCH (e:Entity {canonical_key: $canonical_key}), (m:Entity {canonical_key: $matiz_de})
        MERGE (e)-[r:MATIZ_DE]->(m)
        ON CREATE SET
            r.created_at = datetime(),
            r.valid_at = datetime(),
            r.invalid_at = null
        """

        # Restricción transaccional G=(N,R,T) N_e, L, B
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
                    if matiz_de:
                        tx.run(rel_query, canonical_key=canonical_key, matiz_de=matiz_de)

                    # ACR-1.1: Restricción de unión disjunta N_e, L, B
                    res = tx.run(restriccion_query, canonical_key=canonical_key)
                    rec = res.single()
                    violaciones = rec["violaciones"] if rec else 0
                    if violaciones > 0:
                        tx.rollback()
                        raise ValueError(f"Violación de restricción real: el nodo {canonical_key} tiene más de una clase disjunta (Entity, Literal, Blank).")

                    tx.commit()
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en MERGE de entidad: {str(e)}")

    def escribir_ingesta(self, triples: List[Triple], provenance: Provenance) -> int:
        self._asegurar_conexion()
        if not provenance:
            raise Exception("No se puede escribir sin provenance.")

        io_id = getattr(provenance, "io_id", provenance.origen)

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
        MATCH (n:Entity)
        WHERE NOT (n)-[:MATIZ_DE]->()
          AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
          AND NOT (n:User AND n.id = 'root')
        RETURN count(n) as orphans
        """

        restriccion_query = """
        MATCH (n)
        WHERE size([l IN labels(n) WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        campos_faltantes_query = """
        MATCH (n)
        WHERE n.valid_at IS NULL OR n.created_at IS NULL OR NOT exists(n.invalid_at)
        RETURN count(n) as nodos_invalidos
        UNION ALL
        MATCH ()-[r]->()
        WHERE r.valid_at IS NULL OR r.created_at IS NULL OR NOT exists(r.invalid_at)
        RETURN count(r) as aristas_invalidas
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    # Garantizar que el nodo raíz existe
                    tx.run("MERGE (u:Entity:User {id: 'root'}) ON CREATE SET u.canonical_key='root', u.created_at=datetime(), u.valid_at=datetime(), u.invalid_at=null")

                    triples_data = []
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })

                    result = tx.run(query, triples=triples_data, io_id=io_id)
                    record = result.single()
                    escritos = record["count"] if record else 0

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

                    # Verificar Alcanzabilidad
                    orphans_result = tx.run(check_huerfanos)
                    orphans_record = orphans_result.single()
                    if orphans_record and orphans_record["orphans"] > 0:
                        import logging
                        logging.error(f"Error: Ingesta genera {orphans_record['orphans']} nodos huérfanos. IO_ID: {io_id}")
                        tx.rollback()
                        return 0

                    tx.commit()
                    return escritos
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en escribir_ingesta: {str(e)}")

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
