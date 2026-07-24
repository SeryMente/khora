# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import typing

import pytest

from khora_kernel.ports.memoria_organizada import (
    DocumentoMemoria,
    MemoriaOrganizada,
    Provenance,
)
from khora_kernel.ports.mocks.mock_memoria_organizada import MockMemoriaOrganizada


class SuiteContratoMemoriaOrganizada:
    @pytest.fixture
    def adapter(self) -> MemoriaOrganizada:
        raise NotImplementedError

    def test_roundtrip_ingesta_consulta(self, adapter: MemoriaOrganizada) -> None:
        prov = Provenance(origen="test", fecha_ingesta="2023-10-27")
        id_doc = adapter.ingestar("Contenido de prueba", prov, es_publico=False)
        assert id_doc is not None
        assert isinstance(id_doc, str)

        # Debe estar en resultados al ser consulta privada (por defecto)
        resultados = adapter.consultar("prueba", incluir_publicos=False)
        assert any(d.id_documento == id_doc for d in resultados)

    def test_particionamiento_visibilidad(self, adapter: MemoriaOrganizada) -> None:
        prov = Provenance(origen="test", fecha_ingesta="2023-10-27")
        id_privado = adapter.ingestar("Documento confidencial", prov, es_publico=False)
        id_publico = adapter.ingestar("Documento abierto", prov, es_publico=True)

        # La consulta por defecto evalúa publico/privado
        # Dependiendo del diseño, una consulta sin incluir_publicos NO devuelve los publicos
        res_privados = adapter.consultar("Documento", incluir_publicos=False)
        ids_privados = [d.id_documento for d in res_privados]
        assert id_privado in ids_privados
        assert id_publico not in ids_privados

        res_ambos = adapter.consultar("Documento", incluir_publicos=True)
        ids_ambos = [d.id_documento for d in res_ambos]
        assert id_privado in ids_ambos
        assert id_publico in ids_ambos


class TestMockMemoriaOrganizada(SuiteContratoMemoriaOrganizada):
    @pytest.fixture
    def adapter(self) -> MemoriaOrganizada:
        return MockMemoriaOrganizada()


class _RotoMemoriaOrganizada(MemoriaOrganizada):
    def ingestar(
        self, contenido: str, provenance: Provenance, es_publico: bool = False
    ) -> str:
        return "123"

    def consultar(
        self, query: str, incluir_publicos: bool = False
    ) -> typing.List[DocumentoMemoria]:
        return []  # Falla invariante roundtrip


def test_roto_falla_contrato_memoria():
    suite = SuiteContratoMemoriaOrganizada()
    adapter = _RotoMemoriaOrganizada()
    with pytest.raises(AssertionError):
        suite.test_roundtrip_ingesta_consulta(adapter)
