# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import typing
import uuid

from ..memoria_organizada import (
    DocumentoMemoria,
    IngestaFallidaError,
    MemoriaOrganizada,
    Provenance,
)


class MockMemoriaOrganizada(MemoriaOrganizada):
    def __init__(self) -> None:
        self._db: typing.List[DocumentoMemoria] = []

    def ingestar(
        self, contenido: str, provenance: Provenance, es_publico: bool = False
    ) -> str:
        if not contenido.strip():
            raise IngestaFallidaError("No se puede ingestar contenido vacío.")

        doc_id = str(uuid.uuid4())
        doc = DocumentoMemoria(
            id_documento=doc_id,
            contenido=contenido,
            provenance=provenance,
            es_publico=es_publico,
        )
        self._db.append(doc)
        return doc_id

    def consultar(
        self, query: str, incluir_publicos: bool = False
    ) -> typing.List[DocumentoMemoria]:
        resultados: typing.List[DocumentoMemoria] = []
        for doc in self._db:
            # Por simplicidad en mock, si la query está en el contenido lo incluimos
            if query.lower() in doc.contenido.lower():
                if doc.es_publico and incluir_publicos:
                    resultados.append(doc)
                elif not doc.es_publico:
                    resultados.append(doc)
        return resultados
