import json
import typing
import uuid

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
        query = """
        MATCH (e:Entity)
        WHERE e.canonical_key = $label_norm
        RETURN e.canonical_key AS canonical_key, e.embedding AS embedding, e.provenance AS provenance
        """
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, label_norm=label_norm)
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
