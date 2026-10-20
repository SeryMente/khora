"""Causal TLS options/redaction contracts; no actual database is contacted."""
from contextlib import contextmanager
from types import SimpleNamespace as NS
from urllib.parse import parse_qs,urlsplit
import logging
import pytest
from khora_kernel.engine import history
from api.chat_runtime import configure_native_environment


@pytest.mark.parametrize("url,root",[("postgresql://user@db.example.test/history","system"),("postgresql://user@db.example.test/history?sslmode=disable","system"),("postgresql://user@db.example.test/history?sslrootcert=/explicit/ca.pem",None)])
def test_remote_verify_full_with_system_or_explicit_trust(monkeypatch,url,root):
    captured={}
    @contextmanager
    def connect(path,**options):captured.update(options);yield object()
    monkeypatch.setattr(history,"import_module",lambda name:NS(connect=connect))
    with history._postgres(url):pass
    assert captured["sslmode"]=="verify-full"
    assert captured.get("sslrootcert")==root


def test_loopback_test_runtime_does_not_require_tls(monkeypatch):
    captured={}
    @contextmanager
    def connect(path,**options):captured.update(options);yield object()
    monkeypatch.setattr(history,"import_module",lambda name:NS(connect=connect))
    with history._postgres("postgresql://user@127.0.0.1/test"):pass
    assert "sslmode" not in captured and "sslrootcert" not in captured


def test_storage_diagnostics_never_log_private_driver_text(monkeypatch,caplog):
    class Fault(Exception):sqlstate="28P01"
    def connect(*args,**kw):raise Fault("PRIVATE_SECRET_AND_DATABASE_URL")
    monkeypatch.setattr(history,"import_module",lambda name:NS(connect=connect))
    with caplog.at_level(logging.WARNING),pytest.raises(history.HistoryStorageError) as error:
        with history._postgres("postgresql://user@db.example.test/history"):pass
    assert "PRIVATE_SECRET" not in caplog.text+str(error.value)
    assert "category=authentication sqlstate=28P01" in caplog.text


def test_native_webui_preserves_verify_full_and_adds_system_roots(monkeypatch):
    for key in ["KHORA_API_KEY","KHORA_CHAT_WEBUI_SECRET"]:monkeypatch.setenv(key,"synthetic-value-"*4)
    monkeypatch.setenv("KHORA_CHAT_HISTORY_DATABASE_URL","postgresql://user@db.example.test/history")
    monkeypatch.setenv("KHORA_CHAT_WEBUI_DATABASE_URL","postgresql://user@db.example.test/native?sslmode=disable")
    configure_native_environment()
    import os
    query=parse_qs(urlsplit(os.environ["DATABASE_URL"]).query)
    assert query["sslmode"]==["verify-full"] and query["sslrootcert"]==["system"]
    assert query["options"]==["-c search_path=khora_openwebui"]
