import pytest

from khora_kernel.constructor._extraer import _fkgc_temperature


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
