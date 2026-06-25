"""CN-MVP: puente Caja Negra <-> bucle de entrenamiento (no es la Caja Negra final)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from comind.blackbox.biodatum import BioDatum
from comind.blackbox.store import seal
from comind.esteg.dataset import Example, build_dataset
from comind.esteg.record import EstegRecord


def ingest_datum(entrada: str, etiqueta: int, root: Path, source: str = "cn-mvp") -> EstegRecord:
    datum = BioDatum(
        datum_id=uuid.uuid4().hex,
        sealed_secret=entrada,
        source=source,
        labels=[str(etiqueta)],
    )
    record = seal(datum, root)
    return EstegRecord(
        id=datum.datum_id,
        text=entrada,
        bit=etiqueta,
        created_at=datetime.now(timezone.utc),
        derived_from=str(record["seal_hash"]),
    )


def to_training_examples(record: EstegRecord) -> list[Example]:
    return build_dataset([record.text], bits=(record.bit,))
