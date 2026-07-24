# @l0 L0-002 · @req PKG-00/REQ-1 · @acr ACR-1.1
# @ua UA-01, UA-02, UA-03, UA-04
from typing import Any, Dict, List, Optional

from khora_kernel.api import Provenance, Triple
from khora_kernel.drivers.neo4j_memoria import Neo4jMemoriaOrganizadaDriver
from khora_kernel.ports.memoria_organizada import (
    DocumentoMemoria,
)
from khora_kernel.ports.memoria_organizada import Provenance as PortProvenance


class Neo4jMemoriaOrganizada:
    """Delegador hacia el driver para mantener la compatibilidad del motor/."""
    def __init__(self, uri: str, user: str, password: str):
        self._driver = Neo4jMemoriaOrganizadaDriver(uri, user, password)

    def ingestar(self, contenido: str, provenance: PortProvenance, es_publico: bool = False) -> str:
        return self._driver.ingestar(contenido, provenance, es_publico)

    def consultar(self, query: str, incluir_publicos: bool = False) -> List[DocumentoMemoria]:
        return self._driver.consultar(query, incluir_publicos)

    def crear_triple(self, origen_id: str, destino_id: str, relacion: str, provenance: Provenance, metadata: Dict[str, str]) -> Triple:
        return self._driver.crear_triple(origen_id, destino_id, relacion, provenance, metadata)

    def buscar_entidades_candidatas(self, label_norm: str) -> List[Dict[str, Any]]:
        return self._driver.buscar_entidades_candidatas(label_norm)

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: List[float], matiz_de: Optional[str] = None, needs_review: bool = False) -> None:
        self._driver.merge_entidad(canonical_key, label_original, provenance_raw, embedding, matiz_de, needs_review)

    def escribir_ingesta(self, triples: List[Triple], provenance: Provenance) -> int:
        return self._driver.escribir_ingesta(triples, provenance)

    def frecuencia(self, canonical_key: str) -> int:
        return self._driver.frecuencia(canonical_key)

    def linea_temporal(self, desde: str, hasta: str) -> List[Dict[str, Any]]:
        return self._driver.linea_temporal(desde, hasta)
