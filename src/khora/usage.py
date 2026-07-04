"""Instrumentación de uso de Khora: registra qué días hubo captura.

Reutiliza el mismo almacén SQLite del proyecto (ruta en KHORA_DB) y expone:
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

_DEFAULT_DB = "/workspaces/khora/khora.db"


def _db_path() -> str:
    return os.environ.get("KHORA_DB", _DEFAULT_DB)


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

def adherence_summary(weeks: int = 4, today: "str | None" = None) -> dict:
    """Resume la adherencia de las ultimas `weeks` semanas (ventana que termina hoy).

    Reutiliza adherence_log() para no duplicar la logica de marcado diario.
    `today` se inyecta (ISO) para determinismo.
    """
    from datetime import date, timedelta

    if weeks < 1:
        raise ValueError("weeks debe ser >= 1")
    end = date.fromisoformat(today) if today is not None else date.today()
    days_total = weeks * 7
    start = end - timedelta(days=days_total - 1)
    log = adherence_log(start.isoformat(), end.isoformat())
    days_used = sum(1 for d in log if d["used"])
    pct = round(days_used / days_total * 100, 1) if days_total else 0.0
    per_week = []
    for w in range(weeks):
        chunk = log[w * 7 : (w + 1) * 7]
        used = sum(1 for d in chunk if d["used"])
        per_week.append(
            {
                "week": w + 1,
                "start": chunk[0]["day"],
                "end": chunk[-1]["day"],
                "used": used,
                "pct": round(used / 7 * 100, 1),
            }
        )
    return {
        "days_total": days_total,
        "days_used": days_used,
        "pct": pct,
        "per_week": per_week,
        "window": {"start": start.isoformat(), "end": end.isoformat()},
    }
