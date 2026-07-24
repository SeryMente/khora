# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import typing
from dataclasses import dataclass


class IngestaDeArchivosError(Exception):
    """Excepción base para fallos en la Ingesta de Archivos."""

    pass


class ArchivoCorruptoError(IngestaDeArchivosError):
    """Lanzada cuando el archivo bruto está corrupto o malformado."""

    pass


class FormatoNoSoportadoError(IngestaDeArchivosError):
    """Lanzada cuando el formato de archivo es irreconocible."""

    pass


@dataclass(frozen=True)
class MetadatosArchivo:
    nombre: str
    extension: str
    tamano_bytes: int


@dataclass(frozen=True)
class ArchivoNormalizado:
    contenido_texto: str
    hash_sha256: str
    metadatos: MetadatosArchivo


class IngestaDeArchivos(typing.Protocol):
    def procesar_archivo(
        self, nombre_archivo: str, contenido_bruto: bytes
    ) -> ArchivoNormalizado:
        """Procesa un archivo bruto y devuelve su contenido normalizado."""
        ...
