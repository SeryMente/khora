"""Evaluacion honesta a N pequeno: validacion cruzada + semillas."""
import random
from dataclasses import dataclass

from comind.esteg.model import frozen_embedding
from comind.esteg.train import train

SEEDS = (0, 1, 2, 3)


@dataclass
class EvalReport:
    mean: float
    std: float
    low: float
    high: float
    verdict: str


def _verdict(low: float) -> str:
    return "lectura > azar" if low > 0.5 else "sin dato concluyente"


def _predict(weights: list[float], bias: float, text: str) -> int:
    x = frozen_embedding(text)
    z = sum(w * xi for w, xi in zip(weights, x)) + bias
    return 1 if z >= 0.0 else 0


def _accuracy(weights: list[float], bias: float, rows: list[tuple[str, int]]) -> float:
    hits = sum(1 for t, y in rows if _predict(weights, bias, t) == y)
    return hits / max(len(rows), 1)


def cross_validate(samples: list[tuple[str, int]], k: int = 4) -> EvalReport:
    accs: list[float] = []
    n = len(samples)
    for seed in SEEDS:
        order = list(range(n))
        random.Random(seed).shuffle(order)
        for f in range(k):
            test_idx = set(order[f::k])
            test = [samples[i] for i in test_idx]
            trn = [samples[i] for i in range(n) if i not in test_idx]
            if not test or not trn:
                continue
            res = train(trn)
            accs.append(_accuracy(res.weights, res.bias, test))
    m = len(accs)
    mean = sum(accs) / max(m, 1)
    var = sum((a - mean) ** 2 for a in accs) / max(m, 1)
    std = var ** 0.5
    low = mean - std
    return EvalReport(mean, std, low, mean + std, _verdict(low))
