# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
"""Kernel history: compatible SQLite or explicitly configured PostgreSQL.

PostgreSQL uses only khora_chat_kernel.sessions. Provision its schema separately;
runtime credentials need SELECT/INSERT/UPDATE, not CREATE or access to PKG data.
No automatic migration, connection-secret logging, or fallback to ephemeral SQLite.
"""
import json
import logging
import re
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from importlib import import_module
from typing import Any, Iterator, List, Optional
from urllib.parse import urlsplit, parse_qs


@dataclass(frozen=True)
class HtStep:
    n: int
    state: str
    ts: str
    detail: str
    observation: Any = None


@dataclass(frozen=True)
class HtEvidence:
    node_id: str
    triple: str
    source_step: int


@dataclass(frozen=True)
class Ht:
    session_id: str
    created_at: str
    steps: List[HtStep] = field(default_factory=list)
    evidence: List[HtEvidence] = field(default_factory=list)
    verdicts: List[Any] = field(default_factory=list)
    trace: List[Any] = field(default_factory=list)


@dataclass(frozen=True)
class Response:
    answer: str
    citations: List[str]
    ht_ref: str


class HistoryStorageError(RuntimeError):
    """Intentionally excludes connection URLs, SQL details and history contents."""


def _is_postgres(db_path: str) -> bool:
    return db_path.startswith(("postgresql://", "postgres://"))


@contextmanager
def _postgres(db_path: str) -> Iterator[Any]:
    try:
        driver = import_module("psycopg")
        # Never allow a URL option to disable TLS for a non-loopback database.
        local = urlsplit(db_path).hostname in {"localhost", "127.0.0.1", "::1"}
        options: dict[str, Any] = {
            "connect_timeout": 8,
            "options": "-c statement_timeout=20000 -c lock_timeout=5000",
        }
        if not local:
            options["sslmode"] = "verify-full"
            root = parse_qs(urlsplit(db_path).query).get("sslrootcert", [""])[-1]
            if root in {"", "system"}:
                # Binary libpq can use a different compiled-in OpenSSL store.
                # Use maintained Mozilla roots, never disable chain/host checks.
                import certifi
                options["sslrootcert"] = certifi.where()
        with driver.connect(db_path, **options) as conn:
            yield conn
    except Exception as exc:
        # Operational diagnostics use a closed vocabulary, never driver text,
        # URLs, SQL, subjects/certificates, credentials or history contents.
        state = getattr(exc, "sqlstate", None)
        state = state if isinstance(state, str) and re.fullmatch(r"[0-9A-Z]{5}", state) else "unavailable"
        text = str(exc).lower()
        category = (
            "driver_missing" if isinstance(exc, ImportError) else
            "authentication" if state in {"28P01", "28000"} else
            "permission" if state == "42501" else
            "schema_missing" if state == "42P01" else
            "tls_root_missing" if "root certificate file" in text and "does not exist" in text else
            "tls_verification" if "certificate verify failed" in text else
            "timeout" if "timeout" in text or "timed out" in text else
            "connection_or_query"
        )
        logging.warning("KHORA_HISTORY_STORAGE_FAILURE category=%s sqlstate=%s", category, state)
        raise HistoryStorageError(
            "No se pudo acceder al historial PostgreSQL; no se usó almacenamiento alternativo."
        ) from None


def _deserialize(payload: Any) -> Ht:
    data = json.loads(payload) if isinstance(payload, str) else payload
    return Ht(
        session_id=data["session_id"],
        created_at=data["created_at"],
        steps=[HtStep(**s) for s in data.get("steps", [])],
        evidence=[HtEvidence(**e) for e in data.get("evidence", [])],
        verdicts=data.get("verdicts", []),
        trace=data.get("trace", []),
    )


def init_db(db_path: str = "data/khora_sessions.db"):
    if _is_postgres(db_path):
        # Deliberately read-only: missing schema must not trigger production DDL.
        with _postgres(db_path) as conn:
            conn.execute(
                "SELECT session_id, ht_json, updated_at FROM khora_chat_kernel.sessions LIMIT 0"
            )
        return
    # Do not interpret an unsupported database URL as a local filesystem path.
    if "://" in db_path:
        raise HistoryStorageError("Tipo de almacenamiento de historial no admitido.")
    directory = os.path.dirname(db_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                ht_json TEXT,
                updated_at TEXT
            )
        """)


def save_ht(ht: Ht, db_path: str = "data/khora_sessions.db"):
    payload = json.dumps(asdict(ht))
    updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if _is_postgres(db_path):
        with _postgres(db_path) as conn:
            conn.execute(
                "INSERT INTO khora_chat_kernel.sessions (session_id, ht_json, updated_at) "
                "VALUES (%s, %s::jsonb, %s::timestamptz) "
                "ON CONFLICT (session_id) DO UPDATE SET "
                "ht_json = EXCLUDED.ht_json, updated_at = EXCLUDED.updated_at",
                (ht.session_id, payload, updated_at),
            )
        return
    init_db(db_path)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (session_id, ht_json, updated_at) VALUES (?, ?, ?)",
            (ht.session_id, payload, updated_at),
        )


def load_ht(session_id: str, db_path: str = "data/khora_sessions.db") -> Optional[Ht]:
    if _is_postgres(db_path):
        with _postgres(db_path) as conn:
            row = conn.execute(
                "SELECT ht_json FROM khora_chat_kernel.sessions WHERE session_id = %s",
                (session_id,),
            ).fetchone()
            return _deserialize(row[0]) if row else None
    init_db(db_path)
    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT ht_json FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        return _deserialize(row[0]) if row else None
