"""Real PostgreSQL integration; never uses DATABASE_URL or production secrets.

Requires the explicitly disposable loopback database khora_history_test.
A skipped run is not PostgreSQL evidence. The dedicated CI supplies this database.
"""
import importlib.util
import os
import sys
import unittest
from dataclasses import replace
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

URL = os.environ.get("KHORA_TEST_HISTORY_POSTGRES", "")
SOURCE = Path(__file__).resolve().parent / "history.py"
if not SOURCE.exists():
    SOURCE = Path(__file__).resolve().parents[2] / "src/khora_kernel/engine/history.py"
spec = importlib.util.spec_from_file_location("live_history_under_test", SOURCE)
assert spec is not None and spec.loader is not None
history = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = history
spec.loader.exec_module(history)


@unittest.skipUnless(URL, "No disposable PostgreSQL configured; not live evidence")
class PostgreSQLLiveHistoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        parsed = urlsplit(URL)
        if parsed.hostname not in {"localhost", "127.0.0.1", "::1"} or parsed.path != "/khora_history_test":
            raise RuntimeError("Integration tests refuse non-disposable database targets")
        cls.driver = psycopg
        # The test owner provisions only the isolated history schema, never PKG.
        with psycopg.connect(URL) as conn:
            conn.execute("CREATE SCHEMA IF NOT EXISTS khora_chat_kernel")
            conn.execute("CREATE TABLE IF NOT EXISTS khora_chat_kernel.sessions ("
                         "session_id TEXT PRIMARY KEY, ht_json JSONB NOT NULL, "
                         "updated_at TIMESTAMPTZ NOT NULL)")

    def setUp(self):
        self.key = "integration:" + uuid4().hex

    def tearDown(self):
        with self.driver.connect(URL) as conn:
            conn.execute("DELETE FROM khora_chat_kernel.sessions WHERE session_id LIKE %s", (self.key + "%",))

    def test_full_history_roundtrip_and_update_across_connections(self):
        item = history.Ht(self.key, "2026-10-19T17:00:00Z",
                          [history.HtStep(1, "RETRIEVE", "now", "Fuente", {"q": "¿α?"})],
                          [history.HtEvidence("n1", "Literal α", 1)],
                          [{"verdict": "SUFFICIENT"}], [{"action": "ANSWER"}])
        history.init_db(URL)
        history.save_ht(item, URL)
        self.assertEqual(history.load_ht(self.key, URL), item)
        updated = replace(item, trace=[{"action": "FOLLOWUP"}])
        history.save_ht(updated, URL)
        self.assertEqual(history.load_ht(self.key, URL), updated)
        with self.driver.connect(URL) as conn:
            count = conn.execute("SELECT COUNT(*) FROM khora_chat_kernel.sessions WHERE session_id = %s", (self.key,)).fetchone()[0]
            self.assertEqual(count, 1)

    def test_missing_key_and_no_cross_key_read(self):
        a = history.Ht(self.key + ":a", "then")
        b = history.Ht(self.key + ":b", "then")
        history.save_ht(a, URL)
        history.save_ht(b, URL)
        self.assertEqual(history.load_ht(a.session_id, URL), a)
        self.assertEqual(history.load_ht(b.session_id, URL), b)
        self.assertIsNone(history.load_ht(self.key + ":missing", URL))

    def test_malformed_json_fails_closed(self):
        with self.driver.connect(URL) as conn:
            conn.execute("INSERT INTO khora_chat_kernel.sessions VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)",
                         (self.key, '{"invalid":true}'))
        with self.assertRaises(history.HistoryStorageError) as error:
            history.load_ht(self.key, URL)
        self.assertNotIn(URL, str(error.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
