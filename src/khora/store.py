from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Optional

from khora.models import RawCapture

_DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS raw_capture (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    text TEXT NOT NULL,
    hash TEXT NOT NULL,
    modality TEXT NOT NULL,
    pipeline_version TEXT NOT NULL
)
"""


def get_db_path() -> Path:
    db_path = os.getenv("KHORA_DB")
    if not db_path:
        raise EnvironmentError("KHORA_DB is not defined")
    return Path(db_path)


def _connect() -> sqlite3.Connection:
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _initialize_database() -> None:
    conn = _connect()
    try:
        conn.executescript(_DB_SCHEMA)
        conn.commit()
    finally:
        conn.close()


def save_capture(capture: RawCapture) -> None:
    _initialize_database()
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO raw_capture (id, timestamp, source, text, hash, modality, pipeline_version) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                capture.id,
                capture.timestamp.isoformat(),
                capture.source,
                capture.text,
                capture.hash,
                capture.modality.value,
                capture.pipeline_version,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def fetch_capture(capture_id: str) -> Optional[RawCapture]:
    _initialize_database()
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, timestamp, source, text, hash, modality, pipeline_version FROM raw_capture WHERE id = ?",
            (capture_id,),
        ).fetchone()
        if row is None:
            return None
        return RawCapture.model_validate(dict(row))
    finally:
        conn.close()


def fetch_all_captures() -> list[RawCapture]:
    _initialize_database()
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, timestamp, source, text, hash, modality, pipeline_version FROM raw_capture"
        ).fetchall()
        return [RawCapture.model_validate(dict(row)) for row in rows]
    finally:
        conn.close()
