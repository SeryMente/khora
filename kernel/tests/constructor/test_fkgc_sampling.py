import pytest

from khora_kernel.api import Provenance, RespuestaLLM
from khora_kernel.constructor._extraer import _fkgc_temperature, _llm_ner


def test_fkgc_temperature_default_is_positive():
    assert _fkgc_temperature() == pytest.approx(0.01)


def test_fkgc_temperature_rejects_zero(monkeypatch):
    monkeypatch.setenv("KHORA_FKGC_TEMPERATURE", "0")
    with pytest.raises(ValueError, match="> 0"):
        _fkgc_temperature()


def test_fkgc_temperature_rejects_above_canonical_recommended_range(monkeypatch):
    monkeypatch.setenv("KHORA_FKGC_TEMPERATURE", "0.2")
    with pytest.raises(ValueError, match="<= 0.1"):
        _fkgc_temperature()


def test_fkgc_request_carries_positive_sampling_temperature(monkeypatch):
    monkeypatch.setenv("KHORA_FKGC_TEMPERATURE", "0.01")

    class Provider:
        def __init__(self):
            self.requests = []

        def generar(self, solicitud):
            self.requests.append(solicitud)
            return RespuestaLLM(
                texto="A,rel,B,Concepto",
                modelo="test",
                provenance=Provenance(
                    origen="test",
                    driver="test",
                    timestamp="2026-10-02T00:00:00Z",
                ),
            )

    provider = Provider()
    triples = _llm_ner("A relaciona B", provider)

    assert triples == [("A", "rel", "B", "Concepto")]
    assert provider.requests[0].metadata["role"] == "fKGC"
    assert provider.requests[0].metadata["temperature"] == pytest.approx(0.01)
