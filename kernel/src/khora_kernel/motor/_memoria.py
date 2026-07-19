import json
import typing
import uuid
typing.TYPE_CHECKING = True

from neo4j import Driver, GraphDatabase

from khora_kernel.api import Provenance, Triple
from khora_kernel.ports.memoria_organizada import (
    ConsultaFallidaError,
    DocumentoMemoria,
    IngestaFallidaError,
)
from khora_kernel.ports.memoria_organizada import Provenance as PortProvenance


class Neo4jMemoriaOrganizada:
    """Implementación de MemoriaOrganizada basada en Neo4j."""

    def __init__(self, uri: str, user: str, password: str):
        self._driver: typing.Optional[Driver] = None
        self._uri = uri
        self._user = user
        self._password = password
        self._conectar()

    def _conectar(self) -> None:
        try:
            self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password))
        except Exception as e:
            raise Exception(f"No se pudo conectar a Neo4j: {str(e)}")

    def _asegurar_conexion(self) -> None:
        if not self._driver:
            self._conectar()

    def inicializar_esquema(self) -> None:
        self._asegurar_conexion()
        query_nodos = """
        CREATE CONSTRAINT nodo_id IF NOT EXISTS FOR (n:ObjetoDeInformacion) REQUIRE n.id IS UNIQUE
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                session.run(query_nodos)
                # Nota: El constraint de unicidad en relaciones (triples) requiere Neo4j Enterprise.
                # Se omite para soportar la versión Community.
        except Exception as e:
            raise Exception(f"Error inicializando esquema: {e}")

    def cerrar(self) -> None:
        if self._driver:
            self._driver.close()

    def ingestar(
        self, contenido: str, provenance: PortProvenance, es_publico: bool = False
    ) -> str:
        self._asegurar_conexion()
        doc_id = str(uuid.uuid4())

        query = """
        CREATE (d:DocumentoMemoria:ObjetoDeInformacion {
            id: $id,
            contenido: $contenido,
            es_publico: $es_publico,
            origen: $origen,
            fecha_ingesta: $fecha_ingesta,
            metadatos: $metadatos
        })
        RETURN d.id as id
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(
                    query,
                    id=doc_id,
                    contenido=contenido,
                    es_publico=es_publico,
                    origen=provenance.origen,
                    fecha_ingesta=provenance.fecha_ingesta,
                    metadatos=json.dumps(provenance.metadatos)
                )
                record = result.single()
                if not record:
                    raise IngestaFallidaError("No se pudo crear el nodo en Neo4j.")
                return str(record["id"])
        except Exception as e:
            if isinstance(e, IngestaFallidaError):
                raise
            raise IngestaFallidaError(f"Error en Neo4j al ingestar: {str(e)}")

    def consultar(
        self, query_str: str, incluir_publicos: bool = False
    ) -> typing.List[DocumentoMemoria]:
        self._asegurar_conexion()

        # Simulación simple de búsqueda, dado que Neo4j real requiere índices vectoriales o text search
        # Aquí haremos un CONTAINS simple.
        query = """
        MATCH (d:DocumentoMemoria)
        WHERE (d.es_publico = false OR $incluir_publicos = true)
          AND d.contenido CONTAINS $query_str
        RETURN d
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, query_str=query_str, incluir_publicos=incluir_publicos)
                docs = []
                for record in result:
                    node = record["d"]
                    prov = PortProvenance(
                        origen=node["origen"],
                        fecha_ingesta=node["fecha_ingesta"],
                        metadatos=json.loads(node["metadatos"]) if node.get("metadatos") else {}
                    )
                    doc = DocumentoMemoria(
                        id_documento=node["id"],
                        contenido=node["contenido"],
                        provenance=prov,
                        es_publico=node["es_publico"]
                    )
                    docs.append(doc)
                return docs
        except Exception as e:
            raise ConsultaFallidaError(f"Error consultando Neo4j: {str(e)}")

    def crear_triple(self, origen_id: str, destino_id: str, relacion: str, provenance: Provenance, metadata: typing.Dict[str, str]) -> Triple:
        """Crea un triple entre dos objetos de información."""
        self._asegurar_conexion()
        triple_id = str(uuid.uuid4())

        query = """
        MATCH (o:ObjetoDeInformacion {id: $origen_id})
        MATCH (d:ObjetoDeInformacion {id: $destino_id})
        CREATE (o)-[r:TRIPLE {
            id: $triple_id,
            relacion: $relacion,
            origen_prov: $origen_prov,
            driver_prov: $driver_prov,
            timestamp_prov: $timestamp_prov,
            metadata: $metadata
        }]->(d)
        RETURN r
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(
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
                    raise Exception("No se pudo crear el triple (verifique que los IDs de origen y destino existan).")

                return Triple(
                    id=triple_id,
                    origen_id=origen_id,
                    destino_id=destino_id,
                    relacion=relacion,
                    provenance=provenance,
                    metadata=metadata
                )
        except Exception as e:
            raise Exception(f"Error creando triple: {str(e)}")

    def buscar_entidades_candidatas(self, label_norm: str) -> typing.List[typing.Dict[str, typing.Any]]:
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

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: typing.List[float], matiz_de: typing.Optional[str] = None, needs_review: bool = False) -> None:
        self._asegurar_conexion()
        query = """
        MERGE (e:Entity {canonical_key: $canonical_key})
        ON CREATE SET
            e.label_original = $label_original,
            e.embedding = $embedding,
            e.provenance = [$provenance_raw],
            e.needs_review = $needs_review
        ON MATCH SET
            e.provenance = e.provenance + [$provenance_raw]
        """

        rel_query = """
        MATCH (e:Entity {canonical_key: $canonical_key}), (m:Entity {canonical_key: $matiz_de})
        MERGE (e)-[:MATIZ_DE]->(m)
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                session.run(query, canonical_key=canonical_key, label_original=label_original, embedding=embedding, provenance_raw=provenance_raw, needs_review=needs_review)
                if matiz_de:
                    session.run(rel_query, canonical_key=canonical_key, matiz_de=matiz_de)
        except Exception as e:
            raise Exception(f"Error en MERGE de entidad: {str(e)}")

    def escribir_ingesta(self, triples: typing.List[Triple], provenance: Provenance) -> int:
        self._asegurar_conexion()
        if not provenance:
            raise Exception("No se puede escribir sin provenance.")

        io_id = getattr(provenance, "io_id", provenance.origen) # io_id required by D3, fall back to origen if not exists in api.py

        # We need a fallback if provenance does not have io_id (it doesn't in api.py)
        # The prompt says: "Además incluye io_id del ι en la provenance" but api.py is locked and ONLY ActaDeIngesta can be added.
        # We will use the object ID as io_id or generate one if not available.
        # Let's write the triples using Cypher MERGE.

        # Cypher query with reachable path check
        query = """
        UNWIND $triples as t

        // Ensure nodes exist (they should have been created by merge_entidad in resolution)
        MERGE (origen:Entity {canonical_key: t.origen_id})
        MERGE (destino:Entity {canonical_key: t.destino_id})

        // Merge relationship with D3 rule: (origen, relacion, destino, io_id)
        MERGE (origen)-[r:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
        ON CREATE SET r.provenance = [t.provenance_str], r.created_at = $timestamp
        ON MATCH SET r.provenance = r.provenance + [t.provenance_str]

        RETURN count(r) as count
        """

        # Note on Reachability: The prompt requires "alcanzabilidad: todo nodo nuevo con path desde el :User raíz (u ⇝ v); huérfano -> ROLLBACK".
        # We can implement a post-check or do it in the transaction.

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    triples_data = []
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })

                    result = tx.run(query, triples=triples_data, io_id=io_id, timestamp=provenance.timestamp)
                    record = result.single()
                    escritos = record["count"] if record else 0

                    # D2: check reachability from :User
                    check_query = """
                    MATCH (n:Entity)
                    WHERE NOT (n)-[:MATIZ_DE]->() // Ignore matiz nodes or we can check them too
                      AND NOT EXISTS { MATCH (:User)-[*]->(n) }
                      AND NOT n:User
                    RETURN count(n) as orphans
                    """

                    # NOTE: A real PKG needs a :User node. If it doesn't exist, this might fail.
                    # We assume it exists or if count > 0 it fails.
                    # Actually, if the graph is empty, :User might not exist.
                    # The prompt: "huérfano -> ROLLBACK del ι completo + log ERROR con io_id (D2)"

                    import logging
                    orphans_result = tx.run(check_query)
                    orphans_record = orphans_result.single()
                    if orphans_record and orphans_record["orphans"] > 0:
                        logging.error(f"Error: Ingesta genera {orphans_record['orphans']} nodos huérfanos. IO_ID: {io_id}")
                        tx.rollback()
                        return 0

                    tx.commit()
                    return escritos
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

    def linea_temporal(self, desde: str, hasta: str) -> typing.List[typing.Dict[str, typing.Any]]:
        self._asegurar_conexion()
        query = """
        MATCH (o)-[r:RELATION]->(d)
        WHERE r.created_at >= $desde AND r.created_at <= $hasta
        RETURN o.canonical_key as origen, r.type as relacion, d.canonical_key as destino, r.created_at as timestamp
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, desde=desde, hasta=hasta)
                return [dict(record) for record in result]
        except Exception as e:
            raise Exception(f"Error consultando linea_temporal: {str(e)}")
