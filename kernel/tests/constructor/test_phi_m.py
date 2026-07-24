# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06
import logging

from khora_kernel.api import ObjetoDeInformacion, Provenance
from khora_kernel.constructor import phi_m


def test_acr_1_1_determinismo_real():
    """
    ACR-1.1: correr ΦM dos veces sobre el mismo fixture real → conjuntos de triples idénticos
    """
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="fixture_real_01",
        texto="Texto real de prueba para determinismo",
        provenance=prov,
        metadata={"autor": "Ada Lovelace", "fecha": "1843-08-01", "tema": "Computación"}
    )

    run1 = phi_m(obj)
    run2 = phi_m(obj)

    assert len(run1) == len(run2)
    assert run1 == run2

def test_acr_1_2_cero_llamadas_llm(caplog):
    """
    ACR-1.2: el log de ejecución NO contiene ninguna llamada a modelo de lenguaje
    """
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="fixture_real_02",
        texto="Texto para verificar ausencia de LLM",
        provenance=prov,
        metadata={"fuente": "Sensor", "ubicacion": "Lab A"}
    )

    with caplog.at_level(logging.DEBUG):
        phi_m(obj)

    log_text = caplog.text.lower()
    assert "llm" not in log_text
    assert "generar" not in log_text
    assert "puerto" not in log_text
    assert "prompt" not in log_text

def test_acr_1_3_head_y_bitemporal():
    """
    ACR-1.3: toda tripleta tiene head nι y porta valid_at / invalid_at / created_at
    """
    timestamp_ingesta = "2026-07-19T00:00:00Z"
    prov = Provenance(origen="test", driver="test", timestamp=timestamp_ingesta)
    nodo_instancia = "fixture_real_03"
    obj = ObjetoDeInformacion(
        id=nodo_instancia,
        texto="Texto para campos bi-temporales",
        provenance=prov,
        metadata={"autor": "Alan Turing"}
    )

    triples = phi_m(obj)

    assert len(triples) > 0
    for triple in triples:
        # Head de toda tripleta = nodo de instancia nι del IO de origen
        assert triple.origen_id == nodo_instancia

        # Campos bi-temporales presentes y con valores correctos
        assert triple.created_at == timestamp_ingesta
        assert triple.valid_at == timestamp_ingesta
        assert triple.invalid_at is None
