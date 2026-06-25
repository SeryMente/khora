"""Contrato del registro ESTEG (Pydantic)."""
from datetime import datetime

from pydantic import BaseModel, Field


class EstegRecord(BaseModel):
    id: str
    text: str = Field(min_length=1)
    bit: int = Field(ge=0, le=1)
    created_at: datetime
    derived_from: str | None = None
