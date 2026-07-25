# @l0 L0-002 · @req VIS-01/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1 · @ua UA-22,UA-23,UA-24,UA-25

import os

import pytest
from neo4j import GraphDatabase

from khora_kernel.api import Provenance, PuertoLLM, RespuestaLLM, SolicitudLLM
from khora_kernel.tvis import ResultadoVisual, refinar_visual


class MockPuertoLLM(PuertoLLM):
    def __init__(self, expected_response: str = "Evidencia mock"):
        self.expected_response = expected_response
        self.solicitud_recibida = None

    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        self.solicitud_recibida = solicitud
        prov = Provenance(
            origen="llm:mock",
            driver="mock_puerto_llm",
            timestamp="2026-07-25T12:00:00Z"
        )
        return RespuestaLLM(
            texto=self.expected_response,
            modelo="mock-model",
            provenance=prov
        )


@pytest.mark.asyncio
async def test_acr_1_1_bytes_crudos():
    # ACR-1.1: Verify coroutine receives literal bytes, not a string/caption,
    # and properly converts them to base64 within the LLM request.

    # Read fixture
    fixture_path = os.path.join(os.path.dirname(__file__), "data", "fixture.png")
    with open(fixture_path, "rb") as f:
        bytes_imagen = f.read()

    entidades = ["N-001", "N-002"]
    mock_puerto = MockPuertoLLM("Mock VQA Result")

    resultado = await refinar_visual(bytes_imagen, entidades, mock_puerto)

    # Assert return object
    assert isinstance(resultado, ResultadoVisual)
    assert resultado.hallazgo_vqa == "Mock VQA Result"
    assert resultado.bytes_procesados == len(bytes_imagen)
    assert resultado.entidades_consultadas == entidades

    # Assert inner behavior: PuertoLLM must have received base64 string
    assert mock_puerto.solicitud_recibida is not None
    assert mock_puerto.solicitud_recibida.imagenes_base64 is not None
    assert len(mock_puerto.solicitud_recibida.imagenes_base64) == 1

    # Assert base64 conversion is correct
    import base64
    expected_b64 = base64.b64encode(bytes_imagen).decode("utf-8")
    assert mock_puerto.solicitud_recibida.imagenes_base64[0] == expected_b64

    # Assert entities are in the prompt
    assert "N-001" in mock_puerto.solicitud_recibida.prompt
    assert "N-002" in mock_puerto.solicitud_recibida.prompt


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("NEO4J_URI"),
    reason="NEO4J_URI no definido — test de efimeridad requiere Neo4j real"
)
async def test_acr_2_1_efimeridad():
    # ACR-2.1: Verify no new nodes or relationships are created during the tVIS coroutine.
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")

    driver = GraphDatabase.driver(uri, auth=(user, password))

    def count_graph(tx):
        nodes = tx.run("MATCH (n) RETURN count(n) AS cnt").single()["cnt"]
        rels = tx.run("MATCH ()-[r]->() RETURN count(r) AS cnt").single()["cnt"]
        return nodes, rels

    with driver.session() as session:
        nodes_before, rels_before = session.execute_read(count_graph)

    fixture_path = os.path.join(os.path.dirname(__file__), "data", "fixture.png")
    with open(fixture_path, "rb") as f:
        bytes_imagen = f.read()
    entidades = ["N-001"]
    mock_puerto = MockPuertoLLM("Mock VQA Result")

    await refinar_visual(bytes_imagen, entidades, mock_puerto)

    with driver.session() as session:
        nodes_after, rels_after = session.execute_read(count_graph)

    driver.close()

    assert nodes_before == nodes_after, "tVIS no debe crear nodos en el PKG"
    assert rels_before == rels_after, "tVIS no debe crear relaciones en el PKG"