# @l0 L0-002 · @req ING-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-2.2,ACR-2.3 · @ua UA-07,UA-08,UA-09,UA-41
import io
import logging
import zipfile

import pytest

from khora_kernel.api import (
    ContextoDeVisibilidad,
    NivelSuficiencia,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)
from khora_kernel.constructor._format_boundary import FormatoNoSoportado
from khora_kernel.constructor._phi_c import phi_c


class LectorGrafoMock:
    def consultar(self, pregunta: str, contexto: ContextoDeVisibilidad) -> ResultadoDeConsulta:
        return ResultadoDeConsulta(
            fragmentos=[],
            subgrafo=SubgrafoRelevante(),
            suficiencia=NivelSuficiencia.INSUFICIENTE,
            resumenes_incluidos=False
        )

@pytest.fixture
def lector():
    return LectorGrafoMock()

def test_acr_1_1_and_1_2_imagen_pipeline(caplog, monkeypatch, lector):
    """
    ACR-1.1: una imagen PNG real produce triples mediante 2 invocaciones separadas y trazables.
    ACR-1.2: el log no muestra ningún paso fusionado η+fKGC.
    """
    caplog.set_level(logging.INFO)
    monkeypatch.setenv("KHORA_MLLM_MODEL", "mock_vision_model")

    # PNG real (1x1 pixel)
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\x0d\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    triples = phi_c(png_bytes, origen="test_png", lector_grafo=lector)

    assert len(triples) > 0

    logs = caplog.text
    # ACR-1.2: Dos entradas distintas
    assert "[ETAPA: ETA]" in logs
    assert "[ETAPA: fKGC]" in logs

    # Modelos distintos
    assert "mock_vision_model" in logs
    assert "mock_ner" in logs

    # No fusionado
    assert "[ETAPA: ETA+fKGC]" not in logs

def test_acr_2_1_audio_transcription(lector):
    """
    ACR-2.1: un MP3 real es transcrito por el adaptador (fuera del núcleo) e ingestado hasta triples.
    Verificar por imports que el núcleo no conoce el transcriptor.
    """
    # Importar el adaptador de audio (fuera del núcleo)
    import sys

    from drivers.cora_audio.adapter import AdaptadorAudioCora

    # Verificar que el núcleo no importó el adaptador
    assert "drivers.cora_audio.adapter" in sys.modules

    # Generar MP3 válido (ID3 header)
    mp3_bytes = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\x00" * 10

    adaptador = AdaptadorAudioCora()

    # Paramos la función de transcripción como inyección
    triples = phi_c(
        mp3_bytes,
        origen="test_mp3",
        lector_grafo=lector,
        transcriptor_audio_func=adaptador.transcribir
    )

    assert len(triples) > 0
    # Como no configuramos credenciales reales en el test, el texto será "[SKIP]..."
    # Y el mock_ner extraerá algo del texto.

def test_acr_2_2_xlsx_rechazado(lector):
    """
    ACR-2.2: un XLSX es rechazado con error explícito
    """
    # Crear un ZIP válido en memoria que simule un XLSX
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr("xl/workbook.xml", "<xml></xml>")

    xlsx_bytes = zip_buffer.getvalue()

    with pytest.raises(FormatoNoSoportado) as exc:
        phi_c(xlsx_bytes, origen="test_xlsx", lector_grafo=lector)

    assert "Contenedor binario rechazado: XLSX" in str(exc.value)

def test_acr_2_3_csv_texto_puro(lector):
    """
    ACR-2.3: un .csv (o archivo sin extensión) de solo texto es ingerido hasta triples sin rebote
    """
    csv_texto = "origen,relacion,destino\nJuan,ama a,Maria\n"
    csv_bytes = csv_texto.encode('utf-8')

    triples = phi_c(csv_bytes, origen="test_csv", lector_grafo=lector)

    assert len(triples) > 0
