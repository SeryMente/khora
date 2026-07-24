# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import pytest

from khora_kernel.ports.ingesta_de_archivos import IngestaDeArchivos
from khora_kernel.ports.mocks.mock_ingesta_de_archivos import MockIngestaDeArchivos


class SuiteContratoIngestaDeArchivos:
    @pytest.fixture
    def adapter(self) -> IngestaDeArchivos:
        raise NotImplementedError

    def test_procesar_archivo(self, adapter: IngestaDeArchivos) -> None:
        res = adapter.procesar_archivo("test.txt", b"hola mundo")
        assert res.contenido_texto
        assert res.hash_sha256
        assert res.metadatos.nombre == "test.txt"
        assert res.metadatos.tamano_bytes == len(b"hola mundo")


class TestMockIngestaDeArchivos(SuiteContratoIngestaDeArchivos):
    @pytest.fixture
    def adapter(self) -> IngestaDeArchivos:
        return MockIngestaDeArchivos()


class _RotoIngestaDeArchivos(IngestaDeArchivos):
    def procesar_archivo(self, nombre_archivo: str, contenido_bruto: bytes):
        from khora_kernel.ports.ingesta_de_archivos import (
            ArchivoNormalizado,
            MetadatosArchivo,
        )

        # Falla: metadata con tamaño incorrecto
        return ArchivoNormalizado("txt", "hash", MetadatosArchivo("test.txt", "txt", 0))


def test_roto_falla_contrato_ingesta():
    suite = SuiteContratoIngestaDeArchivos()
    adapter = _RotoIngestaDeArchivos()
    with pytest.raises(AssertionError):
        suite.test_procesar_archivo(adapter)
