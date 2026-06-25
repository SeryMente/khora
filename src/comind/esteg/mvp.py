"""ESTEG-MVP: bucle real de entrenamiento sobre datos ingresados por CN-MVP."""
from __future__ import annotations

from pathlib import Path

from comind.cn import ingest_datum
from comind.esteg.checkpoint import RunRecord, log_run
from comind.esteg.dataset import build_dataset
from comind.esteg.eval import cross_validate
from comind.esteg.train import train


def run_mvp(entradas: list[str], root: Path, runs_path: Path) -> RunRecord:
    records = [ingest_datum(entrada, idx % 2, root) for idx, entrada in enumerate(entradas)]
    sentences = [record.text for record in records]
    examples = build_dataset(sentences, bits=(0, 1))
    samples = [(example.carrier, example.bit) for example in examples]
    result = train(samples)
    report = cross_validate(samples)
    return log_run(result, n_real=len(records), metric=report.mean, path=runs_path)
