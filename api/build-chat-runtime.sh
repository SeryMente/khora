#!/usr/bin/env bash
# Official Open WebUI0.12.3 slim installation; unchanged wheel pinned by digest.
# Run at build time only. Runtime never installs packages or runs DDL migrations.
set -euo pipefail
root=$(git rev-parse --show-toplevel)
cd "$root"
python -c 'import sys; assert (3,11) <= sys.version_info[:2] < (3,14), "Python3.11-3.13 required"'
python -m pip install -r api/requirements.txt -r api/requirements-openwebui-slim.txt
wheel_dir=$(mktemp -d)
python -m pip download --no-deps --only-binary=:all: --dest "$wheel_dir" open-webui==0.12.3
printf '%s  %s\n' '6d716039a5c15ecdb1db12f99dd9c79ea5c86d3d7bbd9a67054dd26f1f534747' "$wheel_dir/open_webui-0.12.3-py3-none-any.whl" | sha256sum --check --status
python -m pip install --no-deps "$wheel_dir/open_webui-0.12.3-py3-none-any.whl"
python -c 'import importlib.metadata as m; assert m.version("open-webui")=="0.12.3"; import psycopg,neo4j,faiss,igraph; print("KHORA_NATIVE_SLIM_BUILD_OK")'
if [ "${KHORA_CHAT_PUBLIC_READINESS_PROBE:-0}" = "1" ]; then
    python -m api.probe_chat_public_readiness
fi

if [ -n "${KHORA_CHAT_E72_INGEST:-}" ] && [ "${KHORA_CHAT_E72_INGEST}" != "0" ]; then
    python -m api.chat_public_fixture
fi
