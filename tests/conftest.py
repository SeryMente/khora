import pytest

@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    monkeypatch.setenv("KHORA_DB", str(tmp_path / "khora.db"))
    yield
