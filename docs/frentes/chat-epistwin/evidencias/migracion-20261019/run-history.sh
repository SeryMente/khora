#!/usr/bin/env bash
set -euo pipefail
ROOT=/data/chat-ent01
PGROOT=$(mktemp -d "$ROOT/postgres.XXXXXX")
trap 'pg_ctl -D "$PGROOT/data" -m fast -w stop >/dev/null 2>&1 || true' EXIT
initdb -D "$PGROOT/data" -A trust --no-locale -E UTF8 > "$PGROOT/init.log" 2>&1
pg_ctl -D "$PGROOT/data" -l "$PGROOT/server.log" -o "-h 127.0.0.1 -p 55439 -k $PGROOT" -w start >/dev/null
createdb -h 127.0.0.1 -p 55439 khora_history_test
export KHORA_TEST_HISTORY_POSTGRES='postgresql://vercel-sandbox@127.0.0.1:55439/khora_history_test?sslmode=disable'
"$ROOT/py311/bin/python" "$ROOT/source/kernel/tests/engine/test_history_storage.py" > "$ROOT/history-unit311.log" 2>&1
"$ROOT/py311/bin/python" "$ROOT/source/kernel/tests/engine/test_history_postgres_live.py" > "$ROOT/history-live311.log" 2>&1
printf 'UNIT_PY311\n'; tail -n 4 "$ROOT/history-unit311.log"
printf 'LIVE_POSTGRES_PY311\n'; tail -n 7 "$ROOT/history-live311.log"
psql "$KHORA_TEST_HISTORY_POSTGRES" -Atc 'SELECT version(); SELECT count(*) FROM khora_chat_kernel.sessions;'
printf '%s\n' "$PGROOT" > "$ROOT/postgres-dir"
