# @l0 L0-002 · @req PKG-00/REQ-1 · @acr ACR-1.1
# @ua UA-01, UA-02, UA-03, UA-04
import json
import uuid
from typing import Any, Dict, List, Optional

from neo4j import GraphDatabase

from khora_kernel.api import Provenance, Triple
from khora_kernel.ports.memoria_organizada import (
    ConsultaFallidaError,
    DocumentoMemoria,
    IngestaFallidaError,
)
from khora_kernel.ports.memoria_organizada import Provenance as PortProvenance


class Neo4jMemoriaOrganizadaDriver:
    """Implementación de MemoriaOrganizada basada en Neo4j. Sustrato PKG bi-temporal G=(N,R,T)."""

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

    def _verificar_restricciones_locales(self, tx, nodos_involucrados: List[str], require_reachability: bool = True):
        restriccion_query = """
        UNWIND $nodos as n_id
        MATCH (n {id: n_id})
        WITH n, labels(n) as lbls
        WHERE size([l IN lbls WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        bitemp_query = """
        UNWIND $nodos as n_id
        MATCH (n {id: n_id})
        WITH n,
             (n.valid_at IS NULL OR n.created_at IS NULL OR n.invalid_at IS NULL) as n_inv
        RETURN sum(CASE WHEN n_inv THEN 1 ELSE 0 END) as violaciones_temporales
        """

        bitemp_edges_query = """
        UNWIND $nodos as n_id
        MATCH ({id: n_id})-[r]-()
        WITH r,
             (r.valid_at IS NULL OR r.created_at IS NULL OR r.invalid_at IS NULL) as r_inv
        RETURN sum(CASE WHEN r_inv THEN 1 ELSE 0 END) as violaciones_temporales
        """

        huerfanos_query = """
        UNWIND $nodos as n_id
        MATCH (n:Entity {id: n_id})
        WHERE NOT (n)-[:MATIZ_DE]->()
          AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
          AND NOT (n:User AND n.id = 'root')
        RETURN count(n) as orphans
        """

        res_viol = tx.run(restriccion_query, nodos=nodos_involucrados)
        rec = res_viol.single()
        violaciones = rec["violaciones"] if rec else 0
        if violaciones > 0:
            raise ValueError("Violación de restricción real: el nodo tiene más de una clase disjunta (Entity, Literal, Blank).")

        res_bitemp = tx.run(bitemp_query, nodos=nodos_involucrados)
        rec_bitemp = res_bitemp.single()
        if rec_bitemp and rec_bitemp["violaciones_temporales"] > 0:
            raise ValueError("Violación de restricción bi-temporal: valid_at, invalid_at o created_at faltante en nodos.")

        res_bitemp_r = tx.run(bitemp_edges_query, nodos=nodos_involucrados)
        rec_bitemp_r = res_bitemp_r.single()
        if rec_bitemp_r and rec_bitemp_r["violaciones_temporales"] > 0:
            raise ValueError("Violación de restricción bi-temporal: valid_at, invalid_at o created_at faltante en aristas.")

        if require_reachability:
            res_orphans = tx.run(huerfanos_query, nodos=nodos_involucrados)
            rec_orphans = res_orphans.single()
            orphans = rec_orphans["orphans"] if rec_orphans else 0
            if orphans > 0:
                raise ValueError(f"Error: Ingesta genera {orphans} nodos huérfanos.")

    def ingestar(
        self, contenido: str, provenance: PortProvenance, es_publico: bool = False
    ) -> str:
        self._asegurar_conexion()
        doc_id = str(uuid.uuid4())

        query_str = """
        CREATE (d:Documento:Entity {
            id: $id,
            canonical_key: $id,
            contenido: $contenido,
            es_publico: $es_publico,
            origen: $origen,
            fecha_ingesta: $fecha_ingesta,
            created_at: datetime(),
            valid_at: datetime(),
            invalid_at: null
        })

        MERGE (u:Entity:User {id: 'root'})
        ON CREATE SET u.canonical_key='root', u.created_at=datetime(), u.valid_at=datetime(), u.invalid_at=null

        CREATE (u)-[r:CREATED_DOC {created_at: datetime(), valid_at: datetime(), invalid_at: null}]->(d)
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    tx.run(
                        query_str,
                        id=doc_id,
                        contenido=contenido,
                        es_publico=es_publico,
                        origen=provenance.origen,
                        fecha_ingesta=provenance.fecha_ingesta
                    )
                    self._verificar_restricciones_locales(tx, [doc_id, "root"])
                    tx.commit()
                return doc_id
        except ValueError as e:
            raise e
        except Exception as e:
            raise IngestaFallidaError(f"Error en Neo4j al ingestar: {str(e)}")

    def consultar(
        self, query: str, incluir_publicos: bool = False
    ) -> List[DocumentoMemoria]:
        self._asegurar_conexion()
        query_str = """
        MATCH (d:Documento)
        WHERE d.contenido CONTAINS $query_str
        AND ($incluir_publicos OR NOT d.es_publico)
        RETURN d.id AS id, d.contenido AS contenido, d.es_publico AS es_publico, d.origen AS origen, d.fecha_ingesta AS fecha_ingesta
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query_str, query_str=query, incluir_publicos=incluir_publicos)
                docs = []
                for record in result:
                    prov = PortProvenance(
                        origen=record["origen"],
                        fecha_ingesta=record["fecha_ingesta"]
                    )
                    doc = DocumentoMemoria(
                        id_documento=record["id"],
                        contenido=record["contenido"],
                        provenance=prov,
                        es_publico=record["es_publico"]
                    )
                    docs.append(doc)
                return docs
        except Exception as e:
            raise ConsultaFallidaError(f"Error consultando Neo4j: {str(e)}")

    def crear_triple(self, origen_id: str, destino_id: str, relacion: str, provenance: Provenance, metadata: Dict[str, str]) -> Triple:
        self._asegurar_conexion()
        triple_id = str(uuid.uuid4())

        query = """
        MATCH (o {id: $origen_id})
        MATCH (d {id: $destino_id})
        CREATE (o)-[r:TRIPLE {
            id: $triple_id,
            relacion: $relacion,
            origen_prov: $origen_prov,
            driver_prov: $driver_prov,
            timestamp_prov: $timestamp_prov,
            metadata: $metadata,
            created_at: datetime(),
            valid_at: datetime(),
            invalid_at: null
        }]->(d)
        RETURN r
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    result = tx.run(
                        query,
                        origen_id=origen_id,
                        destino_id=destino_id,
                        triple_id=triple_id,
                        relacion=relacion,
                        origen_prov=provenance.origen,
                        driver_prov=provenance.driver if provenance.driver is not None else "",
                        timestamp_prov=provenance.timestamp,
                        metadata=json.dumps(metadata)
                    )
                    record = result.single()
                    if not record:
                        tx.rollback()
                        raise Exception("No se pudo crear el triple (verifique que los IDs de origen y destino existan).")

                    self._verificar_restricciones_locales(tx, [origen_id, destino_id], require_reachability=False)
                    tx.commit()

                return Triple(
                    id=triple_id,
                    origen_id=origen_id,
                    destino_id=destino_id,
                    relacion=relacion,
                    provenance=provenance,
                    metadata=metadata
                )
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creando triple: {str(e)}")

    def buscar_entidades_candidatas(self, label_norm: str) -> List[Dict[str, Any]]:
        self._asegurar_conexion()
        import os
        limit = int(os.environ.get("KHORA_ER_CAND_LIMIT", "500"))
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
            e.id = $canonical_key,
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

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    tx.run(query, canonical_key=canonical_key, label_original=label_original, embedding=embedding, provenance_raw=provenance_raw, needs_review=needs_review)
                    if matiz_de:
                        tx.run(rel_query, canonical_key=canonical_key, matiz_de=matiz_de)

                    self._verificar_restricciones_locales(tx, [canonical_key], require_reachability=False)
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

        query = """
        UNWIND $triples as t

        MERGE (origen:Entity {canonical_key: t.origen_id})
        ON CREATE SET
            origen.id = t.origen_id,
            origen.created_at = datetime(),
            origen.valid_at = datetime(),
            origen.invalid_at = null

        MERGE (destino:Entity {canonical_key: t.destino_id})
        ON CREATE SET
            destino.id = t.destino_id,
            destino.created_at = datetime(),
            destino.valid_at = datetime(),
            destino.invalid_at = null

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

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    tx.run("MERGE (u:Entity:User {id: 'root'}) ON CREATE SET u.canonical_key='root', u.created_at=datetime(), u.valid_at=datetime(), u.invalid_at=null")

                    triples_data = []
                    nodos_involucrados = set()

                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })
                        nodos_involucrados.add(t.origen_id)
                        nodos_involucrados.add(t.destino_id)

                    result = tx.run(query, triples=triples_data, io_id=io_id)
                    record = result.single()
                    escritos = record["count"] if record else 0

                    nodos_verificar = list(nodos_involucrados)
                    if "root" not in nodos_verificar:
                        nodos_verificar.append("root")

                    self._verificar_restricciones_locales(tx, nodos_verificar, require_reachability=True)
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
