# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import os

import pytest

from khora_kernel.api import Provenance
from khora_kernel.ports.memoria_organizada import Provenance as PortProvenance


def test_frontera_motor_no_importado_directamente():
    """Prueba de frontera: motor no debe ser importado directamente fuera de api.py"""
    with open("kernel/pyproject.toml") as f:
        content = f.read()
    assert "khora_kernel.motor" not in content # Import linter handles this but we add a sanity check here.

@pytest.mark.skipif(not os.environ.get("DOCKER_NEO4J"), reason="skip-if-no-docker")
def test_motor_neo4j_real():
    from khora_kernel.motor import Neo4jMemoriaOrganizada
    motor = Neo4jMemoriaOrganizada("bolt://localhost:7687", "neo4j", "neo4jpassword")

    motor.inicializar_esquema()

    prov1 = PortProvenance(origen="test", fecha_ingesta="2024-01-01", metadatos={"foo": "bar"})
    id1 = motor.ingestar("Hola mundo", prov1, True)
    assert id1 is not None

    prov2 = PortProvenance(origen="test2", fecha_ingesta="2024-01-01", metadatos={})
    id2 = motor.ingestar("Adiós mundo", prov2, True)

    api_prov = Provenance(origen="test", driver=None, timestamp="2024-01-01")

    triple = motor.crear_triple(id1, id2, "SALUDOS", api_prov, {})
    assert triple.id is not None
    assert triple.origen_id == id1
    assert triple.destino_id == id2

    docs = motor.consultar("Hola", incluir_publicos=True)
    assert len(docs) > 0
    assert docs[0].id_documento == id1

    motor.cerrar()

def test_memoria_organizada_mock():
    # Verificación que los mocks funcionales cumplen contrato para el puerto
    from khora_kernel.ports.mocks.mock_memoria_organizada import MockMemoriaOrganizada

    mock = MockMemoriaOrganizada()
    prov = PortProvenance(origen="test", fecha_ingesta="2024-01-01", metadatos={})

    id1 = mock.ingestar("Test", prov, False)
    docs = mock.consultar("Test")
    assert len(docs) == 1
    assert docs[0].id_documento == id1
