"""Checkpoint de pesos + bitacora fechada de corridas (esteg_runs.jsonl)."""
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from comind.esteg.train import TrainResult

RUNS_PATH = Path("data/esteg_runs.jsonl")


@dataclass
class RunRecord:
    timestamp: str
    n_real: int
    epochs: int
    loss_ini: float
    loss_fin: float
    metric: float


def save_weights(result: TrainResult, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"weights": result.weights, "bias": result.bias}
    path.write_text(json.dumps(payload), encoding="utf-8")


def load_weights(path: Path) -> TrainResult:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return TrainResult(payload["weights"], payload["bias"], [])


def log_run(result: TrainResult, n_real: int, metric: float, path: Path) -> RunRecord:
    losses = result.losses or [0.0]
    record = RunRecord(
        timestamp=datetime.now(timezone.utc).isoformat(),
        n_real=n_real,
        epochs=len(result.losses),
        loss_ini=losses[0],
        loss_fin=losses[-1],
        metric=metric,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record.__dict__) + "\n")
    return record
