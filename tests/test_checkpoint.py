import json

from comind.esteg.checkpoint import load_weights, log_run, save_weights
from comind.esteg.train import TrainResult


def _result() -> TrainResult:
    return TrainResult([0.1, -0.2, 0.3], 0.05, [0.69, 0.40, 0.21])


def test_weights_roundtrip(tmp_path):
    path = tmp_path / "w.json"
    save_weights(_result(), path)
    loaded = load_weights(path)
    assert loaded.weights == [0.1, -0.2, 0.3]
    assert loaded.bias == 0.05


def test_log_run_appends_dated_rows(tmp_path):
    runs = tmp_path / "esteg_runs.jsonl"
    log_run(_result(), n_real=16, metric=0.75, path=runs)
    rec = log_run(_result(), n_real=16, metric=0.80, path=runs)
    lines = runs.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2
    row = json.loads(lines[-1])
    assert row["n_real"] == 16 and row["epochs"] == 3
    assert row["loss_ini"] == 0.69 and row["loss_fin"] == 0.21
    assert row["metric"] == 0.80 and "T" in row["timestamp"]
    assert rec.loss_fin < rec.loss_ini
