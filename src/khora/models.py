from datetime import datetime
from enum import Enum
from pydantic import BaseModel

PIPELINE_VERSION = "v0"

class Modality(str, Enum):
    text = "text"

class RawCapture(BaseModel):
    id: str
    timestamp: datetime
    source: str
    text: str          # obligatorio: sin texto, falla a propósito
    hash: str
    modality: Modality = Modality.text
    pipeline_version: str = PIPELINE_VERSION
