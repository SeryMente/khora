# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
from dataclasses import dataclass, field
from pathlib import Path
from typing import List


@dataclass(frozen=True)
class ManifiestoModulo:
    nombre: str
    version: str
    puertos_requeridos: List[str]
    permisos_visibilidad: List[str]
    entrypoint: str
    ficha_ch2: str


@dataclass(frozen=True)
class HostConfig:
    corpus_path: Path = field(
        default_factory=lambda: Path.home() / ".khora"
    )
