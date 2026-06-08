import pytest

@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    monkeypatch.setenv("COMIND_DB", str(tmp_path / "comind.db"))
    yield
