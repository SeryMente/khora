from khora.nous.cobertura.extractor import extraer_cobertura, Cobertura
import os
from unittest.mock import patch
import pytest

def test_cobertura_clara():
    # Este test pasará por el fallback regex determinista al no haber key
    with patch.dict(os.environ, {}, clear=True):
        texto = 'Trabajé de 09:00 a 13:00 hoy en el proyecto.'
        res = extraer_cobertura(texto)
        assert res.inicio == '09:00'
        assert res.fin == '13:00'
        assert res.horas_cubiertas == 4.0
        assert res.confianza == 'Alta'
        assert res.evidencia != 'Insuficiente'

def test_cobertura_ambigua():
    with patch.dict(os.environ, {}, clear=True):
        texto = 'Hoy estuve un buen rato en el proyecto, como toda la mañana.'
        res = extraer_cobertura(texto)
        assert res.horas_cubiertas is None
        assert res.evidencia == 'Insuficiente'
        assert res.confianza == 'Baja'

def test_cobertura_sin_credenciales():
    """
    (c) sin credenciales -> salida limpia.
    Verificamos que el extractor no falla y sigue funcionando determinísticamente
    aún sin variables de entorno o credenciales.
    """
    with patch.dict(os.environ, {}, clear=True):
        texto = "Trabajé de 15:00 a 16:30"
        res = extraer_cobertura(texto)
        assert res.inicio == "15:00"
        assert res.fin == "16:30"
        assert res.horas_cubiertas == 1.5
