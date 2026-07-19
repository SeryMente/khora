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
            self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password)) # type: ignore
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
            with self._driver.session() as session: # type: ignore
                session.run(query_nodos) # type: ignore
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
            with self._driver.session() as session: # type: ignore
                result = session.run( # type: ignore
                    query,
                    id=doc_id,
                    contenido=contenido,
                    es_publico=es_publico,
                    origen=provenance.origen,
                    fecha_ingesta=provenance.fecha_ingesta,
                    metadatos=json.dumps(provenance.metadatos)
                )
                record = result.single() # type: ignore
                if not record:
                    raise IngestaFallidaError("No se pudo crear el nodo en Neo4j.")
                return str(record["id"]) # type: ignore
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
            with self._driver.session() as session: # type: ignore
                result = session.run(query, query_str=query_str, incluir_publicos=incluir_publicos) # type: ignore
                docs: typing.List[DocumentoMemoria] = []
                for record in result: # type: ignore
                    node = record["d"] # type: ignore
                    prov = PortProvenance(
                        origen=node["origen"], # type: ignore
                        fecha_ingesta=node["fecha_ingesta"], # type: ignore
                        metadatos=json.loads(node["metadatos"]) if node.get("metadatos") else {} # type: ignore
                    )
                    doc = DocumentoMemoria(
                        id_documento=node["id"], # type: ignore
                        contenido=node["contenido"], # type: ignore
                        provenance=prov,
                        es_publico=node["es_publico"] # type: ignore
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
            with self._driver.session() as session: # type: ignore
                result = session.run( # type: ignore
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
                record = result.single() # type: ignore
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
