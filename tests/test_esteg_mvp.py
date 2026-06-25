"""Prueba real ESTEG-MVP: entrena >=1 iteracion sobre datos CN-MVP y registra."""
import json
from pathlib import Path

from comind.blackbox.store import list_public
from comind.esteg.mvp import run_mvp


def test_corre_iteracion_real_y_registra(tmp_path: Path) -> None:
    entradas = ["frase uno real", "frase dos real", "frase tres real", "frase cuatro"]
    runs_path = tmp_path / "runs.jsonl"
    record = run_mvp(entradas, tmp_path / "bb", runs_path)
    assert record.epochs >= 1
    assert record.n_real == 4
    assert 0.0 <= record.metric <= 1.0
    assert runs_path.exists()
    lines = [ln for ln in runs_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert len(lines) == 1
    assert json.loads(lines[0])["epochs"] == record.epochs


def test_datos_quedan_sellados_en_caja_negra(tmp_path: Path) -> None:
    root = tmp_path / "bb"
    run_mvp(["secreto-aaa", "secreto-bbb"], root, tmp_path / "runs.jsonl")
    pub = list_public(root)
    assert len(pub) == 2
    raw = (root / "blackbox.jsonl").read_text(encoding="utf-8")
    assert "secreto-aaa" not in raw
    assert "secreto-bbb" not in raw
