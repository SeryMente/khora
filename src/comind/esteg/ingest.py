"""Ingesta de frases reales por la ruta de captura del repo."""
from comind import inbox
from comind.models import RawCapture

SOURCE = "esteg-seed"


def ingest_sentences(sentences: list[str], source: str = SOURCE) -> list[RawCapture]:
    return [inbox.add(text, source=source) for text in sentences]
