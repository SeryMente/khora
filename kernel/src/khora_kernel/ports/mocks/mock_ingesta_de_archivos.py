# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import hashlib

from ..ingesta_de_archivos import (
    ArchivoCorruptoError,
    ArchivoNormalizado,
    IngestaDeArchivos,
    MetadatosArchivo,
)


class MockIngestaDeArchivos(IngestaDeArchivos):
    def procesar_archivo(
        self, nombre_archivo: str, contenido_bruto: bytes
    ) -> ArchivoNormalizado:
        if not contenido_bruto:
            raise ArchivoCorruptoError("El archivo no tiene contenido.")

        ext = nombre_archivo.split(".")[-1] if "." in nombre_archivo else "unknown"
        meta = MetadatosArchivo(
            nombre=nombre_archivo, extension=ext, tamano_bytes=len(contenido_bruto)
        )

        texto_norm = f"Contenido mock para {nombre_archivo}"
        m = hashlib.sha256()
        m.update(contenido_bruto)

        return ArchivoNormalizado(
            contenido_texto=texto_norm, hash_sha256=m.hexdigest(), metadatos=meta
        )
