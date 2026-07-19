import json
import os
import sqlite3
from dataclasses import asdict, dataclass, field
from typing import Any, List, Optional


@dataclass(frozen=True)
class HtStep:
    n: int
    state: str
    ts: str
    detail: str

@dataclass(frozen=True)
class HtEvidence:
    node_id: str
    triple: str
    source_step: int

@dataclass(frozen=True)
class Ht:
    session_id: str
    created_at: str
    steps: List[HtStep] = field(default_factory=lambda: [])
    evidence: List[HtEvidence] = field(default_factory=lambda: [])
    verdicts: List[Any] = field(default_factory=lambda: [])

@dataclass(frozen=True)
class Response:
    answer: str
    citations: List[str]
    ht_ref: str

def init_db(db_path: str = "data/khora_sessions.db"):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                ht_json TEXT,
                updated_at TEXT
            )
        """)

def save_ht(ht: Ht, db_path: str = "data/khora_sessions.db"):
    init_db(db_path)
    from datetime import datetime, timezone
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions (session_id, ht_json, updated_at)
            VALUES (?, ?, ?)
            """,
            (ht.session_id, json.dumps(asdict(ht)), datetime.now(timezone.utc).isoformat() + "Z")
        )

def load_ht(session_id: str, db_path: str = "data/khora_sessions.db") -> Optional[Ht]:
    init_db(db_path)
    with sqlite3.connect(db_path) as conn:
        cur = conn.execute("SELECT ht_json FROM sessions WHERE session_id = ?", (session_id,))
        row = cur.fetchone()
        if row:
            data = json.loads(row[0])
            steps = [HtStep(**s) for s in data.get("steps", [])]
            evidence = [HtEvidence(**e) for e in data.get("evidence", [])]
            return Ht(
                session_id=data["session_id"],
                created_at=data["created_at"],
                steps=steps,
                evidence=evidence,
                verdicts=data.get("verdicts", [])
            )
    return None
