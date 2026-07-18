import typing
from dataclasses import dataclass, field


class MemoriaOrganizadaError(Exception):
    """Excepción base para fallos en la Memoria Organizada."""

    pass


class IngestaFallidaError(MemoriaOrganizadaError):
    """Lanzada cuando un documento no puede ser ingestado."""

    pass


class ConsultaFallidaError(MemoriaOrganizadaError):
    """Lanzada cuando ocurre un error al consultar la memoria."""

    pass


@dataclass(frozen=True)
class Provenance:
    origen: str
    fecha_ingesta: str
    metadatos: typing.Dict[str, str] = field(default_factory=lambda: typing.cast(typing.Dict[str, str], {}))


@dataclass(frozen=True)
class DocumentoMemoria:
    id_documento: str
    contenido: str
    provenance: Provenance
    es_publico: bool = False


# @req: khora.puertos.memoria
class MemoriaOrganizada(typing.Protocol):
    def ingestar(
        self, contenido: str, provenance: Provenance, es_publico: bool = False
    ) -> str:
        """Ingesta un documento y devuelve su id."""
        ...

    def consultar(
        self, query: str, incluir_publicos: bool = False
    ) -> typing.List[DocumentoMemoria]:
        """Consulta documentos. Por defecto solo evalúa el particionamiento privado/público."""
        ...
