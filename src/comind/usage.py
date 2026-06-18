"""Instrumentación de uso de CoMind: registra qué días hubo captura.

Reutiliza el mismo almacén SQLite del proyecto (ruta en COMIND_DB) y expone:
- record_capture(now): anota un evento de captura fechado.
- days_with_capture(): set de días (YYYY-MM-DD) con >= 1 captura.

El día se deriva directamente de `now` (su propia fecha, sin convertir de
zona horaria) para que la medición sea determinista y case con los tests.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path

_DEFAULT_DB = "/workspaces/comind/comind.db"


def _db_path() -> str:
    return os.environ.get("COMIND_DB", _DEFAULT_DB)


def _connect() -> sqlite3.Connection:
    path = _db_path()
    Path(path).expanduser().parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usage_events ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "day TEXT NOT NULL, "
        "ts TEXT NOT NULL)"
    )
    return conn


def record_capture(now: datetime | None = None) -> None:
    """Anota un evento de captura. `now` se inyecta para determinismo."""
    moment = now if now is not None else datetime.now()
    day = moment.date().isoformat()
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO usage_events (day, ts) VALUES (?, ?)",
            (day, moment.isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def days_with_capture() -> set[str]:
    """Devuelve el set de días (YYYY-MM-DD) con al menos una captura."""
    conn = _connect()
    try:
        rows = conn.execute("SELECT DISTINCT day FROM usage_events").fetchall()
    finally:
        conn.close()
    return {str(row[0]) for row in rows}


def adherence_log(start: str, end: str) -> list[dict[str, object]]:
    """Marca cada dia del rango [start, end] (ISO, inclusivo) como usado/no usado."""
    from datetime import date, timedelta

    first = date.fromisoformat(start)
    last = date.fromisoformat(end)
    if last < first:
        raise ValueError("end debe ser >= start")
    used = days_with_capture()
    out: list[dict[str, object]] = []
    cur = first
    while cur <= last:
        iso = cur.isoformat()
        out.append({"day": iso, "used": iso in used})
        cur += timedelta(days=1)
    return out
