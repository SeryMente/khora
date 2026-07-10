"""Contrato BioDatum v0: separa lo sellado de los metadatos visibles."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from khora.blackbox.sealed import SEALED_FIELDS


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BioDatum(BaseModel):
    datum_id: str
    sealed_secret: str
    created_at: str = Field(default_factory=_now_iso)
    source: str = "cli"
    modality: str = "text"
    labels: list[str] = Field(default_factory=list)
    seal_hash: str = ""

    def model_post_init(self, _ctx: object) -> None:
        if not self.seal_hash:
            self.seal_hash = hashlib.sha256(self.sealed_secret.encode("utf-8")).hexdigest()

    def public_view(self) -> dict[str, object]:
        data = self.model_dump()
        for name in SEALED_FIELDS:
            data.pop(name, None)
        return data
