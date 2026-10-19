"""SQLite tests are real; driver tests are controlled, not live PostgreSQL proof."""
import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import types
import unittest
from dataclasses import asdict, replace
from pathlib import Path
from unittest.mock import patch

# Loads the actual complete module without unrelated optional kernel dependencies.
ROOT = Path(__file__).resolve()
SOURCE = ROOT.parent / "history.py"
if not SOURCE.exists():
    SOURCE = ROOT.parents[2] / "src/khora_kernel/engine/history.py"
spec = importlib.util.spec_from_file_location("history_under_test", SOURCE)
assert spec is not None and spec.loader is not None
history = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = history
spec.loader.exec_module(history)


def sample(session="user-a:chat-a"):
    return history.Ht(
        session, "2026-10-19T17:00:00Z",
        [history.HtStep(1, "RETRIEVE", "now", "Consulta", {"triple": "á→β"})],
        [history.HtEvidence("node-1", "Fuente literal", 1)],
        [{"verdict": "SUFFICIENT"}], [{"action": "ANSWER"}],
    )


class FakeConnection:
    def __init__(self):
        self.calls = []
        self.rows = {}
        self.result = None
        self.exit_types = []
        self.failure = None

    def __enter__(self):
        return self

    def __exit__(self, kind, value, tb):
        self.exit_types.append(kind)
        return False

    def execute(self, sql, params=None):
        self.calls.append((sql, params))
        if self.failure:
            raise self.failure
        if sql.startswith("INSERT"):
            self.rows[params[0]] = json.loads(params[1])
        elif sql.startswith("SELECT ht_json"):
            value = self.rows.get(params[0])
            self.result = (value,) if value is not None else None
        return self

    def fetchone(self):
        return self.result


class SQLiteHistoryTests(unittest.TestCase):
    def test_roundtrip_all_fields_and_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "nested/history.db")
            original = sample()
            history.save_ht(original, path)
            self.assertEqual(history.load_ht(original.session_id, path), original)
            # Connections are closed on each call; reopen database independently.
            with sqlite3.connect(path) as conn:
                data = json.loads(conn.execute("SELECT ht_json FROM sessions").fetchone()[0])
            self.assertEqual(data, asdict(original))

    def test_update_no_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "history.db")
            history.save_ht(sample(), path)
            newer = replace(sample(), trace=[{"new": True}])
            history.save_ht(newer, path)
            self.assertEqual(history.load_ht(newer.session_id, path), newer)
            with sqlite3.connect(path) as conn:
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], 1)

    def test_missing_session_and_separate_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "history.db")
            self.assertIsNone(history.load_ht("missing", path))
            for key in ("user-a:chat-a", "user-b:chat-a", "user-a:chat-b"):
                history.save_ht(sample(key), path)
            for key in ("user-a:chat-a", "user-b:chat-a", "user-a:chat-b"):
                self.assertEqual(history.load_ht(key, path).session_id, key)

    def test_existing_legacy_row_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "history.db")
            history.init_db(path)
            with sqlite3.connect(path) as conn:
                conn.execute("INSERT INTO sessions VALUES (?, ?, ?)",
                             ("old", json.dumps({"session_id": "old", "created_at": "then"}), "then"))
            self.assertEqual(history.load_ht("old", path), history.Ht("old", "then"))

    def test_unsupported_url_does_not_create_local_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                with self.assertRaises(history.HistoryStorageError):
                    history.init_db("mysql://not-a-local-path/db")
                self.assertEqual(list(Path(tmp).iterdir()), [])
            finally:
                os.chdir(cwd)


class PostgreSQLControlledTests(unittest.TestCase):
    def setUp(self):
        self.conn = FakeConnection()
        self.connect_calls = []
        self.url = "postgresql://test-user:NOT-A-REAL-SECRET@db.example.invalid/chat?sslmode=disable"
        def connect(url, **kwargs):
            self.connect_calls.append((url, kwargs))
            return self.conn
        self.patch = patch.dict(sys.modules, {"psycopg": types.SimpleNamespace(connect=connect)})
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_roundtrip_uses_fixed_schema_parameterized_jsonb(self):
        key = "a'; DROP TABLE sessions; --"
        original = sample(key)
        history.save_ht(original, self.url)
        self.assertEqual(history.load_ht(key, self.url), original)
        for sql, params in self.conn.calls:
            self.assertIn("khora_chat_kernel.sessions", sql)
            self.assertNotIn(key, sql)
            self.assertNotIn("CREATE", sql)
            self.assertNotIn("public.", sql)
            self.assertEqual(params[0], key)
        self.assertIn("ON CONFLICT", self.conn.calls[0][0])
        self.assertIn("::jsonb", self.conn.calls[0][0])

    def test_init_is_read_only(self):
        history.init_db(self.url)
        self.assertEqual(len(self.conn.calls), 1)
        self.assertTrue(self.conn.calls[0][0].startswith("SELECT"))
        self.assertIn("LIMIT 0", self.conn.calls[0][0])

    def test_remote_ssl_cannot_be_disabled_by_url(self):
        history.init_db(self.url)
        options = self.connect_calls[0][1]
        self.assertEqual(options["sslmode"], "verify-full")
        self.assertEqual(options["connect_timeout"], 8)
        self.assertIn("statement_timeout=20000", options["options"])
        self.assertIn("lock_timeout=5000", options["options"])

    def test_loopback_allows_explicit_test_configuration(self):
        history.init_db("postgres://test@127.0.0.1/test?sslmode=disable")
        self.assertNotIn("sslmode", self.connect_calls[0][1])

    def test_failure_is_sanitized_and_no_sqlite_fallback(self):
        self.conn.failure = RuntimeError(self.url + " private payload")
        with patch.object(history.sqlite3, "connect", side_effect=AssertionError("fallback")):
            with self.assertRaises(history.HistoryStorageError) as error:
                history.save_ht(sample(), self.url)
        self.assertNotIn(self.url, str(error.exception))
        self.assertNotIn("NOT-A-REAL-SECRET", str(error.exception))
        self.assertIsNone(error.exception.__cause__)
        self.assertEqual(self.conn.exit_types, [RuntimeError])

    def test_missing_returns_none_and_missing_driver_fails_closed(self):
        self.assertIsNone(history.load_ht("missing", self.url))
        with patch.object(history, "import_module", side_effect=ImportError("psycopg")):
            with self.assertRaises(history.HistoryStorageError):
                history.load_ht("missing", self.url)

    def test_string_payload_supported(self):
        self.conn.rows[sample().session_id] = json.dumps(asdict(sample()))
        self.assertEqual(history.load_ht(sample().session_id, self.url), sample())


if __name__ == "__main__":
    unittest.main(verbosity=2)
