"""Almacen JSONL para registros ESTEG."""
from pathlib import Path

from comind.esteg.record import EstegRecord

DATA_PATH = Path("data/esteg.jsonl")


def append(record: EstegRecord, path: Path = DATA_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(record.model_dump_json() + "\n")


def read_all(path: Path = DATA_PATH) -> list[EstegRecord]:
    if not path.exists():
        return []
    out: list[EstegRecord] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            text = line.strip()
            if text:
                out.append(EstegRecord.model_validate_json(text))
    return out
