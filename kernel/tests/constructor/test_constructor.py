# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06

import pytest

from khora_kernel.api import (
    ContextoDeVisibilidad,
    NivelSuficiencia,
    ObjetoDeInformacion,
    Provenance,
    RespuestaLLM,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)
from khora_kernel.constructor import extraer, normalizar, phi_m


def test_phi_m_determinismo():
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="obj-1",
        texto="Texto de prueba",
        provenance=prov,
        metadata={"autor": "Jules", "tema": "AI"}
    )

    # Doble corrida idéntica
    run1 = phi_m(obj)
    run2 = phi_m(obj)

    assert len(run1) == len(run2)
    assert run1[0].id == run2[0].id
    assert run1[1].id == run2[1].id
    assert run1 == run2

def test_mapa_metadatos():
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="obj-1",
        texto="Texto de prueba",
        provenance=prov,
        metadata={"fecha": "2026-07-17", "fuente": "calendario", "desconocido": "x"}
    )

    triples = phi_m(obj)

    relaciones = {t.relacion for t in triples}
    assert "OCCURRED_AT" in relaciones
    assert "FROM_SOURCE" in relaciones
    assert "HAS_METADATA_DESCONOCIDO" in relaciones

def test_texto_identidad():
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="obj-1",
        texto="Texto de prueba",
        provenance=prov,
        metadata={"tipo": "texto"}
    )

    res = normalizar(obj)
    assert res == "Texto de prueba"

def test_imagen_caption(monkeypatch):
    monkeypatch.setenv("KHORA_MLLM_MODEL", "mock")
    prov = Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")
    obj = ObjetoDeInformacion(
        id="obj-1",
        texto="http://example.com/imagen.jpg",
        provenance=prov,
        metadata={"tipo": "imagen"}
    )

    res = normalizar(obj)
    assert res == "[MOCK CAPTION] Imagen descriptiva detectada"

def test_chunks_600_100(monkeypatch):
    monkeypatch.setenv("KHORA_CHUNK_SIZE", "5")
    monkeypatch.setenv("KHORA_CHUNK_OVERLAP", "2")

    texto = "uno dos tres cuatro cinco seis siete ocho nueve diez"
    from khora_kernel.constructor._extraer import _chunk_text

    chunks = _chunk_text(texto)
    assert len(chunks) > 1
    assert len(chunks[0].split()) == 5
    assert chunks[1].split()[0] == "cuatro"

def test_gleaning_tope(monkeypatch):
    monkeypatch.setenv("KHORA_GLEANING_MAX_ROUNDS", "1")
    from khora_kernel.constructor._extraer import _gleaning_loop
    res = _gleaning_loop("texto", [("a", "b", "c")])
    assert res == [("a", "b", "c")]

def test_llm_ner_3_and_4_columns():
    class MockPuertoLLM3:
        def generar(self, solicitud):
            # Verify system prompt has verb restriction and instructions
            assert "NUNCA extraigas un verbo conjugado" in solicitud.sistema
            assert "cuarta columna opcional" in solicitud.sistema
            assert "NO inventes relaciones" in solicitud.sistema
            return RespuestaLLM(
                texto="Juan, trabaja_en, Khora\nMadrid, es_una, Ciudad, Lugar\n",
                modelo="mock",
                provenance=Provenance(origen="mock", driver=None, timestamp=""),
            )

    puerto_3 = MockPuertoLLM3()
    from khora_kernel.constructor._extraer import _llm_ner

    res = _llm_ner("texto de prueba", puerto_3)
    assert len(res) == 2
    assert res[0] == ("Juan", "trabaja_en", "Khora")
    assert res[1] == ("Madrid", "es_una", "Ciudad", "Lugar")

def test_extraer_utc_timestamp_and_tipo_metadata():
    class MockPuertoLLM4:
        def generar(self, solicitud):
            return RespuestaLLM(
                texto="Juan, vive_en, Madrid, Persona\n",
                modelo="mock",
                provenance=Provenance(origen="mock", driver=None, timestamp=""),
            )

    puerto_4 = MockPuertoLLM4()
    triples = extraer("Juan vive en Madrid", None, puerto_llm=puerto_4)

    assert len(triples) == 1
    t = triples[0]
    assert t.metadata == {"tipo": "Persona"}
    assert t.provenance.timestamp != "2026-07-19T00:00:00Z"
    assert "T" in t.provenance.timestamp
    assert t.valid_at == t.provenance.timestamp
    assert t.created_at == t.provenance.timestamp

@pytest.mark.xfail(reason="NO-SIMULACIÓN: Faltan fragmentos reales en data/golden/j7_golden.jsonl, evaluando éxito parcial D5.")
def test_f1():
    assert False, "Faltan fragmentos reales"

class LectorGrafoMock:
    def __init__(self):
        self.escrituras = 0
    def consultar(self, pregunta: str, contexto: ContextoDeVisibilidad) -> ResultadoDeConsulta:
        return ResultadoDeConsulta(
            fragmentos=[],
            subgrafo=SubgrafoRelevante(),
            suficiencia=NivelSuficiencia.INSUFICIENTE,
            resumenes_incluidos=False
        )
    def escribir(self, *args, **kwargs):
        self.escrituras += 1

def test_cero_escrituras():
    lector = LectorGrafoMock()
    texto = "Maria trabaja en Google."
    triples = extraer(texto, lector)

    assert lector.escrituras == 0
    assert len(triples) > 0
    for t in triples:
        assert t.provenance is not None
